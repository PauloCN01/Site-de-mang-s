import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import api from "../../api/api";

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

function Carrinho() {
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
      .get<CarrinhoItem[]>("/carrinho")
      .then((res: any) => {
        const normalizados: CarrinhoItem[] = res.data.map((item: any) => ({
          ...item,
          produto: {
            ...item.produto,
            preco: Number(item?.produto?.preco),
          },
          quantidade: Number(item.quantidade) || 1,
        }));
        setItens(normalizados);
      })
      .catch((err) => {
        console.error(err);
        alert(err?.response?.data?.mensagem || "Erro ao carregar carrinho");
      });
  }, []);

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
        setItens((prev) => prev.map((i) => (i._id === itemId ? { ...i, quantidade: novaQtd } : i)));
      })
      .catch((err) => alert(err?.response?.data?.mensagem || "Erro ao atualizar quantidade"));
  }

  function removerItem(itemId: string) {
    api
      .delete(`/carrinho/${itemId}`)
      .then(() => setItens((prev) => prev.filter((i) => i._id !== itemId)))
      .catch((err) => alert(err?.response?.data?.mensagem || "Erro ao remover item"));
  }

  const total = useMemo(() => {
    return itens.reduce((acc, i) => acc + Number(i.produto.preco) * i.quantidade, 0);
  }, [itens]);

  return (
    <div>
      <h1>Meu Carrinho</h1>

      <div style={{ marginBottom: 12 }}>
        <input
          type="text"
          placeholder="Filtrar por nome do produto"
          value={filtro}
          onChange={(e) => setFiltro(e.target.value)}
        />
      </div>

      {itensFiltrados.length === 0 ? (
        <p>Seu carrinho está vazio.</p>
      ) : (
        <div className="carrinho-lista">
          {itensFiltrados.map((item) => (
            <div key={item._id} className="carrinho-item">
              <img src={item.produto.urlfoto} alt={item.produto.nome} style={{ width: 84, height: 84, objectFit: "cover" }} />
              <div style={{ textAlign: "left" }}>
                <h3>{item.produto.nome}</h3>
                <p>Preço: R$ {Number(item.produto.preco).toFixed(2)}</p>
                <div>
                  <button onClick={() => atualizarQuantidade(item._id, item.quantidade - 1)}>-</button>
                  <input
                    type="number"
                    value={item.quantidade}
                    min={1}
                    onChange={(e) => atualizarQuantidade(item._id, Number(e.target.value))}
                    style={{ width: 60, margin: "0 8px" }}
                  />
                  <button onClick={() => atualizarQuantidade(item._id, item.quantidade + 1)}>+</button>
                </div>
                <button onClick={() => removerItem(item._id)} style={{ marginTop: 8 }}>Remover</button>
              </div>
            </div>
          ))}
        </div>
      )}

      <h2>Total: R$ {total.toFixed(2)}</h2>
    </div>
  );
}

export default Carrinho;
