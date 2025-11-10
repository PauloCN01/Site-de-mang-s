import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import api from "../api/api";
import "./Adm.css"; // CSS separado para admin

interface Produto {
  _id: string;
  nome: string;
  preco: number;
  descricao: string;
  urlfoto: string;
}

// niccole c2: Tipos auxiliares para métricas de carrinhos (admin)
interface CarrinhoItemAdmin {
  produtoId: string;
  nome?: string;
  precoUnitario?: number | string;
  quantidade: number;
}
interface CarrinhoAdmin {
  _id: string;
  usuarioId?: string;
  itens: CarrinhoItemAdmin[];
  atualizadoEm?: string;
}
interface MetricsDirectResponse {
  activeUsers: number;
  totalValue: number;
  ranking: { produtoId: string; nome?: string; count: number }[];
}

function Adm() {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [form, setForm] = useState({ nome: "", preco: "", descricao: "", urlfoto: "" });
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [role, setRole] = useState<string>("user"); // padrão user
  // niccole c2: estados para o dashboard admin
  const [activeUsersCount, setActiveUsersCount] = useState<number>(0);
  const [totalCartValue, setTotalCartValue] = useState<number>(0);
  const [rankingItens, setRankingItens] = useState<{ produtoId: string; nome?: string; count: number }[]>([]);
  const [metricsLoading, setMetricsLoading] = useState<boolean>(false);
  const [metricsError, setMetricsError] = useState<string>("");
  const [produtoParaDeletar, setProdutoParaDeletar] = useState<Produto | null>(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      const mensagem = encodeURIComponent("Faça login como admin para acessar o painel.");
      const redirect = encodeURIComponent(location.pathname + location.search);
      navigate(`/login?mensagem=${mensagem}&redirect=${redirect}`, { replace: true });
      return;
    }

    const payload = JSON.parse(atob(token.split(".")[1]));
    setRole(payload.role);
    if (payload.role !== "admin") {
      const mensagem = encodeURIComponent("Acesso restrito a administradores.");
      navigate(`/?mensagem=${mensagem}`, { replace: true });
      return;
    }

    // Carregar produtos
    api.get<Produto[]>("/produtos")
      .then(res => setProdutos(res.data.map((p: any) => ({ ...p, preco: Number(p.preco) })) ))
      .catch(err => console.log(err));

    // niccole c2: Após validar ADMIN, carregar métricas do dashboard
    carregarMetricasAdmin();
  }, []);

  function handleLogout() {
    localStorage.removeItem('token');
    localStorage.removeItem('userType');
    // notify others
    try { window.dispatchEvent(new CustomEvent('auth-changed')) } catch {}
    const mensagem = encodeURIComponent('Faça login para continuar.');
    navigate(`/login?mensagem=${mensagem}`);
  }

  // Funções de admin
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleAdicionar = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    api.post<Produto>("/produtos", {
      nome: form.nome,
      preco: parseFloat(form.preco),
      descricao: form.descricao,
      urlfoto: form.urlfoto
    })
    .then(res => {
      const novo = { ...res.data, preco: Number((res.data as any).preco) } as Produto;
      setProdutos([...produtos, novo]);
      setForm({ nome: "", preco: "", descricao: "", urlfoto: "" });
    })
    .catch(err => alert(err?.response?.data?.mensagem || "Erro ao adicionar produto"));
  };

  const handleSalvar = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editandoId) return;
    api.put<Produto>(`/produtos/${editandoId}`, {
      nome: form.nome,
      preco: parseFloat(form.preco),
      descricao: form.descricao,
      urlfoto: form.urlfoto
    })
      .then(res => {
        const atualizado = { ...res.data, preco: Number((res.data as any).preco) } as Produto;
        setProdutos(produtos.map(p => (p._id === editandoId ? atualizado : p)));
        setForm({ nome: "", preco: "", descricao: "", urlfoto: "" });
        setEditandoId(null);
      })
      .catch(err => alert(err?.response?.data?.mensagem || "Erro ao salvar produto"));
  };

  const iniciarEdicao = (p: Produto) => {
    setEditandoId(p._id);
    setForm({ nome: p.nome, preco: String(p.preco), descricao: p.descricao, urlfoto: p.urlfoto });
  };

  const cancelarEdicao = () => {
    setEditandoId(null);
    setForm({ nome: "", preco: "", descricao: "", urlfoto: "" });
  };

  const handleExcluir = (id: string) => {
    const produto = produtos.find(p => p._id === id);
    if (produto) {
      setProdutoParaDeletar(produto);
    }
  };

  const confirmarExclusao = () => {
    if (!produtoParaDeletar) return;
    
    api.delete(`/produtos/${produtoParaDeletar._id}`)
      .then(() => {
        setProdutos(produtos.filter(p => p._id !== produtoParaDeletar._id));
        setProdutoParaDeletar(null);  // fecha o dialog
      })
      .catch(err => alert(err?.response?.data?.mensagem || "Erro ao excluir produto"));
  };

  const cancelarExclusao = () => {
    setProdutoParaDeletar(null);  // fecha o dialog
  };

  // niccole c2: utilitário para tentar múltiplos endpoints até encontrar dados de carrinhos
  async function tryGet<T = any>(paths: string[]): Promise<T | null> {
    for (const p of paths) {
      try {
        const r = await api.get<T>(p);
        if (r && r.data) return r.data as any;
      } catch (_) { /* tenta próxima rota */ }
    }
    return null;
  }

  // niccole c2: calcular métricas a partir da lista de carrinhos
  function calcularMetricas(carrinhos: CarrinhoAdmin[]) {
    // usuários com carrinhos "ativos": consideramos carrinhos com pelo menos 1 item
    const usuariosAtivos = new Set<string>();
    let somaTotal = 0;
    const freq = new Map<string, { produtoId: string; nome?: string; count: number }>();

    for (const c of carrinhos) {
      if (Array.isArray(c.itens) && c.itens.length > 0) {
        if (c.usuarioId) usuariosAtivos.add(c.usuarioId);
        for (const it of c.itens) {
          const preco = Number(it.precoUnitario ?? 0);
          const qtd = Number(it.quantidade ?? 0);
          somaTotal += preco * qtd;
          const key = it.produtoId;
          if (!key) continue;
          const prev = freq.get(key) || { produtoId: key, nome: it.nome, count: 0 };
          prev.count += qtd || 1;
          if (!prev.nome && it.nome) prev.nome = it.nome;
          freq.set(key, prev);
        }
      }
    }

    const ranking = Array.from(freq.values()).sort((a, b) => b.count - a.count).slice(0, 10);
    setActiveUsersCount(usuariosAtivos.size);
    setTotalCartValue(somaTotal);
    setRankingItens(ranking);
  }

  // niccole c2: carregar métricas do backend (tenta endpoint direto de métricas e, se não houver, lista todos e calcula)
  async function carregarMetricasAdmin() {
    try {
      setMetricsLoading(true);
      setMetricsError("");

      // 1) Tentar endpoint direto de métricas
      const direct = await tryGet<MetricsDirectResponse>([
        "/admin/carrinhos/metrics",
        "/carrinhos/metrics",
        "/carrinho/metrics"
      ]);
      if (direct && typeof direct === "object") {
        if (typeof (direct as any).activeUsers === "number") setActiveUsersCount((direct as any).activeUsers);
        if (typeof (direct as any).totalValue === "number") setTotalCartValue((direct as any).totalValue);
        if (Array.isArray((direct as any).ranking)) setRankingItens((direct as any).ranking);
        return;
      }

      // 2) Senão, tentar obter todos os carrinhos e calcular no front
      const todos = await tryGet<CarrinhoAdmin[]>([
        "/admin/carrinhos",
        "/carrinhos",
        "/carrinho/todos"
      ]);
      if (Array.isArray(todos)) {
        calcularMetricas(todos);
        return;
      }

      setMetricsError("Não foi possível obter métricas de carrinhos (verifique a API para endpoints de admin).");
    } catch (e: any) {
      setMetricsError(e?.message || "Erro ao carregar métricas");
    } finally {
      setMetricsLoading(false);
    }
  }

  return (
    <div className={`adm-container ${role}`}>
      <div className="adm-header">
        <h1>Painel de Produtos</h1>
        <div className="adm-header-actions">
          <button className="adm-logout-button" onClick={handleLogout}>Logout</button>
        </div>
      </div>

      {/* niccole c2: Seção de métricas do admin - explica o que cada bloco mostra */}
      {role === "admin" && (
        <section className="adm-dashboard" aria-label="Dashboard Administrativo">
          <h2>Dashboard Administrativo — niccole c2</h2>
          <p>
            Esta seção mostra: quantidade de usuários com carrinhos ativos, a soma total dos valores de todos os carrinhos
            e um ranking dos itens mais frequentes nos carrinhos.
          </p>

          {metricsLoading && <p>Carregando métricas...</p>}
          {metricsError && <p style={{ color: "red" }}>{metricsError}</p>}

          {!metricsLoading && !metricsError && (
            <div className="cards-metricas">
              <div className="card-metrica" aria-label="Usuários com carrinhos ativos">
                <strong>Usuários com carrinhos ativos</strong>
                <div>{activeUsersCount}</div>
              </div>
              <div className="card-metrica" aria-label="Soma de todos os carrinhos">
                <strong>Total dos carrinhos</strong>
                <div>R$ {totalCartValue.toFixed(2)}</div>
              </div>
              <div className="card-metrica" aria-label="Ranking de itens mais presentes nos carrinhos">
                <strong>Top itens nos carrinhos</strong>
                {rankingItens.length === 0 ? (
                  <div>Nenhum item encontrado</div>
                ) : (
                  <ol>
                    {rankingItens.map((r) => (
                      <li key={r.produtoId}>
                        {(r.nome || "Item")} — {r.count}x
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            </div>
          )}
        </section>
      )}

      {/* Formulário só aparece para admin */}
      {role === "admin" && (
        <form className="adm-form" onSubmit={editandoId ? handleSalvar : handleAdicionar}>
          <input type="text" name="nome" placeholder="Nome" value={form.nome} onChange={handleChange} required />
          <input type="text" name="preco" placeholder="Preço" value={form.preco} onChange={handleChange} required />
          <textarea name="descricao" placeholder="Descrição" value={form.descricao} onChange={handleChange} required />
          <input type="text" name="urlfoto" placeholder="URL da foto" value={form.urlfoto} onChange={handleChange} required />
          <button type="submit">{editandoId ? "Salvar alterações" : "Adicionar Produto"}</button>
          {editandoId && (
            <button type="button" onClick={cancelarEdicao} style={{ marginLeft: 8 }}>Cancelar</button>
          )}
        </form>
      )}

      {/* Dialog de confirmação de exclusão */}
      {produtoParaDeletar && (
        <div className="confirmation-dialog">
          <div className="dialog-content">
            <h3>Confirmar Exclusão</h3>
            <p>Tem certeza que deseja excluir o produto "{produtoParaDeletar.nome}"?</p>
            <div className="dialog-actions">
              <button onClick={confirmarExclusao}>Confirmar</button>
              <button onClick={cancelarExclusao}>Cancelar</button>
            </div>
          </div>
        </div>
      )}

      <div className="produtos-list">
        {produtos.map(prod => (
          <div key={prod._id} className="produto-card">
            <img src={prod.urlfoto} alt={prod.nome} />
            <h3>{prod.nome}</h3>
            <p>{prod.descricao}</p>
            <p>R$ {prod.preco.toFixed(2)}</p>

            {/* Botões de edição/exclusão só para admin */}
            {role === "admin" && (
              <div className="adm-actions">
                <button onClick={() => iniciarEdicao(prod)}>Editar</button>
                <button onClick={() => handleExcluir(prod._id)}>Excluir</button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default Adm;
