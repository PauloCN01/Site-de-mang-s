import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import './App.css';
import api from './api/api';

type ProdutoType = {
  _id: string;
  preco: number;
  nome: string;
  descricao: string;
  urlfoto: string;
};

function App() {
  const [produtos, setProdutos] = useState<ProdutoType[]>([]);
  const [needLoginPrompt, setNeedLoginPrompt] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // 🔹 Carrega produtos ao abrir a página
  useEffect(() => {
    api.get<ProdutoType[]>("/produtos")
      .then((response: any) => setProdutos(response.data))
      .catch((error) => {
        if (error.response) {
          console.error(`Servidor respondeu mas com erro: ${error.response.data?.mensagem ?? error.message}`);
          alert(`Servidor respondeu mas com erro: ${error.response.data?.mensagem ?? "Olhe o console do navegador para mais detalhes"}`);
        } else {
          console.error(`Erro Axios: ${error.message}`);
          alert(`Servidor não respondeu, vc ligou o backend? Erro do axios: ${error.message ?? "Erro desconhecido"}`);
        }
      });
  }, []);

  // 🔹 Adiciona um item ao carrinho
  function adicionarItemCarrinho(produtoId: string) {
    const token = localStorage.getItem('token');
    if (!token) {
      setNeedLoginPrompt(true);
      return;
    }

    // Encontra o produto pelo ID
    const produto = produtos.find((p) => p._id === produtoId);
    if (!produto) {
      alert("Produto não encontrado!");
      return;
    }

    // Envia todos os dados exigidos pelo backend
    api.post("/carrinho",
      {
        produtoId,
        quantidade: 1,
        precoUnitario: produto.preco,
        nome: produto.nome,
      },
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    )
      .then(() => alert("Produto adicionado corretamente"))
      .catch((error) => {
        if (error.response) {
          console.error(`Servidor respondeu mas com erro: ${error.response.data?.message ?? error.message}`);
          alert(`Servidor respondeu mas com erro: ${error.response.data?.message ?? "Olhe o console do navegador para mais detalhes"}`);
        } else {
          console.error(`Erro Axios: ${error.message}`);
          alert(`Servidor não respondeu, vc ligou o backend? Erro do axios: ${error.message ?? "Erro desconhecido"}`);
        }
      });
  }

  return (
    <>
      <div className="top-actions">
        {!localStorage.getItem('token') && (
          <Link className="login-button" to="/login">Login</Link>
        )}
        {localStorage.getItem('token') && (
          <>
            <Link style={{ marginLeft: 12 }} className="login-button" to="/carrinho">Meu Carrinho</Link>
            <button
              style={{ marginLeft: 12 }}
              className="login-button"
              onClick={() => {
                localStorage.removeItem('token');
                setNeedLoginPrompt(false);
                navigate('/');
              }}
            >
              Sair
            </button>
          </>
        )}
      </div>

      {needLoginPrompt && (
        <div className="login-required-banner">
          <p>Você precisa estar logado para adicionar itens ao carrinho.</p>
          <button
            onClick={() => {
              const redirect = encodeURIComponent(location.pathname + location.search);
              const mensagem = encodeURIComponent('Faça login para continuar.');
              navigate(`/login?mensagem=${mensagem}&redirect=${redirect}`);
            }}
          >
            Fazer login
          </button>
        </div>
      )}

      <h1>Lista de produtos</h1>
      <div className="container">
        {produtos.map((produto) => (
          <div key={produto._id} className="produto-card">
            <h2>{produto.nome}</h2>
            <p>Preço: R$ {produto.preco}</p>
            <p>{produto.descricao}</p>
            <img src={produto.urlfoto} alt={produto.nome} width="150" height="150" />
            <button onClick={() => adicionarItemCarrinho(produto._id)}>
              Adicionar ao carrinho
            </button>
          </div>
        ))}
      </div>
    </>
  );
}

export default App;
