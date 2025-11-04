import axios from 'axios'

const api = axios.create({
    baseURL:import.meta.env.VITE_API_URL
})
//Nós vamos criar um middleware para adicionar o token na requisição

api.interceptors.request.use((config) =>{
    const rawToken = localStorage.getItem("token")
    const base = (axios.defaults.baseURL || import.meta.env.VITE_API_URL || "") as string
    const fullPath = (() => {
        try {
            return new URL(config.url || "", base).pathname
        } catch {
            return config.url || ""
        }
    })()
    const pathLower = (fullPath || "").toLowerCase()
    const publicHints = [
        "/login",
        "/register",
        "/auth/login",
        "/auth/register",
        "/usuarios",
        "/cadastro"
    ]
    const isSkipAuth = !!(config.headers as any)?.["X-Skip-Auth"]
    const isPublic = isSkipAuth || publicHints.some(h => pathLower.includes(h))
    const token = rawToken && rawToken !== "undefined" && rawToken !== "null" ? rawToken : ""
    if(token && !isPublic){
        config.headers = config.headers ?? {}
        ;(config.headers as any).Authorization = `Bearer ${token}`
    }
    return config
})

//Redirecionar para o LOGIN quando o usuário não tiver permissão.
api.interceptors.response.use(
    (response)=>response,
    (error)=>{
        if(error?.code==="ERR_NETWORK"){
            window.location.href=`/error?mensagem=${encodeURIComponent("Ligue o Servidor-> NPM RUN DEV")}`
        }
        const status = error?.response?.status;
        //Usuário não está autenticado ou token inválido

          // 401 ou 403 → redireciona para login (exceto rotas públicas)
    const base = (axios.defaults.baseURL || import.meta.env.VITE_API_URL || "") as string
    const reqUrl = error?.response?.config?.url || ""
    const reqPath = (() => {
        try { return new URL(reqUrl, base).pathname } catch { return reqUrl }
    })()
    const pathLower = (reqPath || "").toLowerCase()
    const publicHints = [
        "/login",
        "/register",
        "/auth/login",
        "/auth/register",
        "/usuarios",
        "/cadastro"
    ]
    const isSkipAuth = !!(error?.response?.config?.headers as any)?.["X-Skip-Auth"]
    const isPublic = isSkipAuth || publicHints.some(h => pathLower.includes(h))
    if ((status === 401 || status === 403) && !isPublic) {
      localStorage.removeItem("token")
      window.location.href = `/login?mensagem=${encodeURIComponent("Token inválido ou sem permissão")}`
    }

        return Promise.reject(error)
    }
)



export default api