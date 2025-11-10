import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import api from "../../api/api";
import "./Carrinho.css"; // importa o CSS 💅

interface CarrinhoItem {
  _id: string;
  produto: {
    _id: string;
    nome: string;
    preco: number | string;
    descricao: string;
    urlfoto: string;
  };
  quantidade: number;
}

interface CarrinhoResponse {
  _id: string;
  itens: any[];
}

function Carrinho() {
  const [carrinhoId, setCarrinhoId] = useState<string>("");
  const [itens, setItens] = useState<CarrinhoItem[]>([]);
  const [filtro, setFiltro] = useState("");
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      const mensagem = encodeURIComponent("Faça login para acessar seu carrinho.");
      const redirect = encodeURIComponent(location.pathname + location.search);
      navigate(`/login?mensagem=${mensagem}&redirect=${redirect}`, { replace: true });
      return;
    }

    api
      .get<CarrinhoResponse>("/carrinho", {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res: any) => {
        if (res.data && Array.isArray(res.data.itens)) {
          setCarrinhoId(res.data._id);
          const normalizados: CarrinhoItem[] = res.data.itens.map((item: any) => ({
            _id: item._id || item.produtoId,
            produto: {
              _id: item.produtoId,
              nome: item.nome || "Produto sem nome",
              preco: Number(item.precoUnitario) || 0,
              descricao: item.descricao || "",
              urlfoto: item.urlfoto || "",
            },
            quantidade: Number(item.quantidade) || 1,
          }));
          setItens(normalizados);
        }
      })
      .catch((err) => {
        console.error(err);
        alert(err?.response?.data?.mensagem || "Erro ao carregar carrinho");
      });
  }, [navigate, location]);

  const itensFiltrados = useMemo(() => {
    const f = filtro.trim().toLowerCase();
    if (!f) return itens;
    return itens.filter((i) => i.produto.nome.toLowerCase().includes(f));
  }, [filtro, itens]);

  function atualizarQuantidade(itemId: string, novaQtd: number) {
    if (novaQtd <= 0) return;

    api
      .put(`/carrinho/${itemId}`, { quantidade: novaQtd })
      .then(() => {
        setItens((prev) =>
          prev.map((i) => (i._id === itemId ? { ...i, quantidade: novaQtd } : i))
        );
      })
      .catch(() => alert("Erro ao atualizar quantidade"));
  }

  function removerItem(itemId: string) {
    if (!carrinhoId) return alert("Carrinho não encontrado");

    api
      .delete(`/carrinho/${carrinhoId}/item/${itemId}`)
      .then(() => setItens((prev) => prev.filter((i) => i._id !== itemId)))
      .catch(() => alert("Erro ao remover item"));
  }

  const total = useMemo(
    () => itens.reduce((acc, i) => acc + Number(i.produto.preco) * i.quantidade, 0),
    [itens]
  );

  return (
    <div className="carrinho-page">
      {/* 🟣 Cabeçalho */}
      <header className="header">
        <h1 className="logo">📚 MangáVerse</h1>
        <nav className="menu">
          <button onClick={() => navigate("/")} className="menu-btn">Início</button>
          <button onClick={() => navigate("/produtos")} className="menu-btn">Mangás</button>
          <button onClick={() => navigate("/perfil")} className="menu-btn">Perfil</button>
        </nav>
      </header>

      <main className="carrinho-container">
        <h2 className="titulo">🛒 Meu Carrinho</h2>

        <div className="filtro-container">
          <input
            type="text"
            placeholder="Filtrar por nome do produto"
            value={filtro}
            onChange={(e) => setFiltro(e.target.value)}
          />
          <button className="voltar-btn" onClick={() => navigate(-1)}>⬅ Voltar</button>
        </div>

        {itensFiltrados.length === 0 ? (
          <p className="vazio">Seu carrinho está vazio.</p>
        ) : (
          <div className="lista-itens">
            {itensFiltrados.map((item) => (
              <div key={item._id} className="card-item">
                <img
                  src={item.produto.urlfoto || "https://via.placeholder.com/84"}
                  alt={item.produto.nome}
                />
                <div className="info-item">
                  <h3>{item.produto.nome}</h3>
                  <p>Preço: R$ {Number(item.produto.preco).toFixed(2)}</p>

                  <div className="quantidade">
                    <button onClick={() => atualizarQuantidade(item._id, item.quantidade - 1)}>
                      -
                    </button>
                    <input
                      type="number"
                      value={item.quantidade}
                      min={1}
                      onChange={(e) =>
                        atualizarQuantidade(item._id, Number(e.target.value))
                      }
                    />
                    <button onClick={() => atualizarQuantidade(item._id, item.quantidade + 1)}>
                      +
                    </button>
                  </div>

                  <button
                    className="remover-btn"
                    onClick={() => removerItem(item._id)}
                  >
                    Remover
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <h2 className="total">Total: R$ {total.toFixed(2)}</h2>
      </main>

      <footer className="footer">
        <p>© 2025 MangáVerse — Todos os direitos reservados.</p>
      </footer>
    </div>
  );
}

export default Carrinho;
