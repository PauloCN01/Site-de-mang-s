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

function Adm() {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [form, setForm] = useState({ nome: "", preco: "", descricao: "", urlfoto: "" });
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [role, setRole] = useState<string>("user"); // padrão user
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
  }, []);

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
    api.delete(`/produtos/${id}`)
      .then(() => setProdutos(produtos.filter(p => p._id !== id)))
      .catch(err => alert(err?.response?.data?.mensagem || "Erro ao excluir produto"));
  };

  return (
    <div className={`adm-container ${role}`}>
      <h1>Painel de Produtos</h1>

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
