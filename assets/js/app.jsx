const { useEffect, useState } = React;

const API_URL = "https://sistema-ponto-backend-a6l8.onrender.com";

const PERFIL_ADMIN = "admin";
const PERFIL_COLABORADOR = "colaborador";

const FORM_CADASTRO_INICIAL = {
    nome: "",
    cpf: "",
    email: "",
    senha: "",
    carga: "8"
};

const FORM_JUSTIFICATIVA_INICIAL = {
    data: "",
    tipo: "entrada",
    obs: ""
};

function useIsDesktop() {
    const getIsDesktop = () => {
        if (typeof window === "undefined" || !window.matchMedia) {
            return false;
        }

        return window.matchMedia("(min-width: 992px)").matches;
    };

    const [isDesktop, setIsDesktop] = useState(getIsDesktop);

    useEffect(() => {
        if (typeof window === "undefined" || !window.matchMedia) {
            return undefined;
        }

        const mediaQuery = window.matchMedia("(min-width: 992px)");
        const atualizarLayout = () => setIsDesktop(mediaQuery.matches);

        atualizarLayout();

        if (mediaQuery.addEventListener) {
            mediaQuery.addEventListener("change", atualizarLayout);
        } else {
            mediaQuery.addListener(atualizarLayout);
        }

        return () => {
            if (mediaQuery.removeEventListener) {
                mediaQuery.removeEventListener("change", atualizarLayout);
            } else {
                mediaQuery.removeListener(atualizarLayout);
            }
        };
    }, []);

    return isDesktop;
}

function App() {
    const [user, setUser] = useState(null);
    const [email, setEmail] = useState("");
    const [senha, setSenha] = useState("");
    const [aba, setAba] = useState("rh");
    const [equipe, setEquipe] = useState([]);
    const [espelho, setEspelho] = useState(null);
    const [colabFocus, setColabFocus] = useState(null);
    const [hora, setHora] = useState(new Date());

    const [formCad, setFormCad] = useState(FORM_CADASTRO_INICIAL);
    const [formJust, setFormJust] = useState(FORM_JUSTIFICATIVA_INICIAL);

    const [status, setStatus] = useState(null);
    const [carregandoLogin, setCarregandoLogin] = useState(false);
    const [carregandoEquipe, setCarregandoEquipe] = useState(false);
    const [carregandoEspelho, setCarregandoEspelho] = useState(false);
    const [carregandoPonto, setCarregandoPonto] = useState(false);
    const [carregandoJustificativa, setCarregandoJustificativa] = useState(false);

    const isDesktop = useIsDesktop();

    const setMensagem = (tipo, texto) => {
        setStatus({ tipo, texto });
    };

    useEffect(() => {
        const timer = setInterval(() => setHora(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        if (!carregandoLogin) return undefined;

        const timer = setTimeout(() => {
            setMensagem("info", "Validando acesso. Se o backend estiver iniciando, essa etapa pode levar alguns segundos.");
        }, 4000);

        return () => clearTimeout(timer);
    }, [carregandoLogin]);

    const requestJson = async (endpoint, options = {}) => {
        const res = await fetch(`${API_URL}${endpoint}`, {
            ...options,
            headers: {
                "Content-Type": "application/json",
                ...(options.headers || {})
            }
        });

        let data = null;

        try {
            data = await res.json();
        } catch (error) {
            data = null;
        }

        if (!res.ok) {
            const mensagemErro = data?.erro || data?.message || "Não foi possível concluir a solicitação.";
            throw new Error(mensagemErro);
        }

        return data;
    };

    const login = async (e) => {
        e.preventDefault();

        if (carregandoLogin) return;

        const emailLogin = email.trim();

        setStatus(null);
        setCarregandoLogin(true);

        try {
            const data = await requestJson("/login", {
                method: "POST",
                body: JSON.stringify({ email: emailLogin, senha })
            });

            setUser(data);
            setAba(data.perfil === PERFIL_ADMIN ? "rh" : "ponto");
            setStatus(null);

            if (data.perfil === PERFIL_ADMIN) {
                buscarEquipe();
            } else {
                buscarEspelho(data.funcionario_id);
            }
        } catch (error) {
            alert(error.message);
            setMensagem("error", error.message);
        } finally {
            setCarregandoLogin(false);
        }
    };

    const buscarEquipe = async () => {
        setCarregandoEquipe(true);

        try {
            const data = await requestJson("/funcionarios");
            setEquipe(Array.isArray(data) ? data : []);
        } catch (error) {
            setEquipe([]);
            setMensagem("error", error.message);
        } finally {
            setCarregandoEquipe(false);
        }
    };

    const buscarEspelho = async (id) => {
        if (!id) return;

        setCarregandoEspelho(true);

        try {
            const data = await requestJson(`/espelho-ponto/${id}`);
            setEspelho(data);
        } catch (error) {
            setEspelho(null);
            setMensagem("error", error.message);
        } finally {
            setCarregandoEspelho(false);
        }
    };

    const baterPonto = async (tipo) => {
        if (!user?.funcionario_id) {
            setMensagem("error", "Usuário sem funcionário vinculado para registrar ponto.");
            return;
        }

        setCarregandoPonto(true);
        setStatus(null);

        try {
            await requestJson("/bater-ponto", {
                method: "POST",
                body: JSON.stringify({
                    funcionario_id: user.funcionario_id,
                    tipo_batida: tipo
                })
            });

            await buscarEspelho(user.funcionario_id);
            setMensagem("success", tipo === "entrada" ? "Entrada registrada com sucesso." : "Saída registrada com sucesso.");
        } catch (error) {
            alert(error.message);
            setMensagem("error", error.message);
        } finally {
            setCarregandoPonto(false);
        }
    };

    const salvarJustificativa = async (e) => {
        e.preventDefault();

        if (!colabFocus?.id) {
            setMensagem("error", "Selecione um colaborador antes de salvar o ajuste.");
            return;
        }

        const dataAjuste = new Date(formJust.data);

        if (Number.isNaN(dataAjuste.getTime())) {
            setMensagem("error", "Informe uma data e hora válidas para o ajuste.");
            return;
        }

        setCarregandoJustificativa(true);
        setStatus(null);

        try {
            await requestJson("/justificar-ponto", {
                method: "POST",
                body: JSON.stringify({
                    funcionario_id: colabFocus.id,
                    tipo_batida: formJust.tipo,
                    data_hora_ajuste: dataAjuste.toISOString(),
                    observacao: formJust.obs
                })
            });

            alert("Ajuste Salvo!");
            setMensagem("success", "Ajuste manual salvo com sucesso.");
            setFormJust({
                ...FORM_JUSTIFICATIVA_INICIAL,
                tipo: formJust.tipo
            });
            await buscarEspelho(colabFocus.id);
        } catch (error) {
            alert(error.message);
            setMensagem("error", error.message);
        } finally {
            setCarregandoJustificativa(false);
        }
    };

    const gerarPDF = () => {
        if (!window.jspdf?.jsPDF) {
            alert("Biblioteca de PDF não carregada.");
            return;
        }

        const detalhesTurnos = Array.isArray(espelho?.detalhes_turnos) ? espelho.detalhes_turnos : [];

        if (!colabFocus || detalhesTurnos.length === 0) {
            alert("Não há dados de ponto para gerar o PDF.");
            return;
        }

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        doc.text(`Relatorio: ${colabFocus.nome_completo}`, 14, 20);

        const rows = detalhesTurnos.map((t) => [
            t.acao || "-",
            t.horario || "-",
            t.horas_neste_periodo || "-",
            t.observacao || "-"
        ]);

        doc.autoTable({
            startY: 30,
            head: [["Acao", "Horario", "Horas", "Obs"]],
            body: rows
        });

        doc.save("ponto.pdf");
    };

    const sair = () => {
        window.location.reload();
    };

    if (!user) {
        return (
            <LoginPage
                email={email}
                senha={senha}
                setEmail={setEmail}
                setSenha={setSenha}
                login={login}
                carregandoLogin={carregandoLogin}
                status={status}
                limparStatus={() => setStatus(null)}
            />
        );
    }

    const isAdmin = user.perfil === PERFIL_ADMIN;

    const workspace = (
        <Workspace
            user={user}
            isAdmin={isAdmin}
            aba={aba}
            hora={hora}
            espelho={espelho}
            equipe={equipe}
            colabFocus={colabFocus}
            formCad={formCad}
            formJust={formJust}
            setFormCad={setFormCad}
            setFormJust={setFormJust}
            buscarEspelho={buscarEspelho}
            setColabFocus={setColabFocus}
            baterPonto={baterPonto}
            salvarJustificativa={salvarJustificativa}
            gerarPDF={gerarPDF}
            carregandoEquipe={carregandoEquipe}
            carregandoEspelho={carregandoEspelho}
            carregandoPonto={carregandoPonto}
            carregandoJustificativa={carregandoJustificativa}
        />
    );

    return (
        <div className="app-root">
            {isDesktop ? (
                <DesktopLayout
                    user={user}
                    isAdmin={isAdmin}
                    aba={aba}
                    setAba={setAba}
                    sair={sair}
                    status={status}
                    limparStatus={() => setStatus(null)}
                    buscarEspelho={buscarEspelho}
                >
                    {workspace}
                </DesktopLayout>
            ) : (
                <MobileLayout
                    user={user}
                    isAdmin={isAdmin}
                    aba={aba}
                    setAba={setAba}
                    sair={sair}
                    status={status}
                    limparStatus={() => setStatus(null)}
                    buscarEspelho={buscarEspelho}
                >
                    {workspace}
                </MobileLayout>
            )}
        </div>
    );
}

function LoginPage({
    email,
    senha,
    setEmail,
    setSenha,
    login,
    carregandoLogin,
    status,
    limparStatus
}) {
    return (
        <main className="safe-page auth-page">
            <section className="auth-card">
                <div className="auth-brand">
                    <span className="brand-mark">⏱</span>
                    <div>
                        <h1 className="brand-title">Sistema de Ponto Pro</h1>
                        <p className="brand-subtitle">Acesso seguro ao painel de ponto</p>
                    </div>
                </div>

                <StatusBanner status={status} onClose={limparStatus} />

                <form onSubmit={login}>
                    <div className="mb-3">
                        <label className="form-label" htmlFor="login-email">E-mail</label>
                        <input
                            id="login-email"
                            type="email"
                            className="form-control"
                            placeholder="seu@email.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            autoComplete="email"
                            required
                        />
                    </div>

                    <div className="mb-4">
                        <label className="form-label" htmlFor="login-senha">Senha</label>
                        <input
                            id="login-senha"
                            type="password"
                            className="form-control"
                            placeholder="Digite sua senha"
                            value={senha}
                            onChange={(e) => setSenha(e.target.value)}
                            autoComplete="current-password"
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        className="btn btn-app-primary w-100"
                        disabled={carregandoLogin}
                    >
                        {carregandoLogin ? "Entrando..." : "Entrar"}
                    </button>
                </form>
            </section>
        </main>
    );
}

function DesktopLayout({
    user,
    isAdmin,
    aba,
    setAba,
    sair,
    status,
    limparStatus,
    buscarEspelho,
    children
}) {
    return (
        <div className="desktop-shell">
            <aside className="sidebar">
                <div className="sidebar-brand">
                    <span className="brand-mark">⏱</span>
                    <div>
                        <h1>Sistema de Ponto Pro</h1>
                        <p>Gestão de jornada</p>
                    </div>
                </div>

                <div className="sidebar-profile">
                    <span>Usuário</span>
                    <strong>{user.nome}</strong>
                </div>

                <div className="sidebar-profile">
                    <span>Perfil</span>
                    <strong>{isAdmin ? "Administrador/RH" : "Colaborador"}</strong>
                </div>

                {isAdmin && (
                    <nav className="sidebar-nav" aria-label="Navegação principal">
                        <button
                            type="button"
                            className={`btn ${aba === "rh" ? "btn-light" : "btn-outline-light"}`}
                            onClick={() => setAba("rh")}
                        >
                            Gestão RH
                        </button>
                        <button
                            type="button"
                            className={`btn ${aba === "ponto" ? "btn-light" : "btn-outline-light"}`}
                            onClick={() => {
                                setAba("ponto");
                                buscarEspelho(user.funcionario_id);
                            }}
                        >
                            Meu Ponto
                        </button>
                    </nav>
                )}
            </aside>

            <main className="desktop-main">
                <header className="desktop-topbar">
                    <div>
                        <h2 className="desktop-heading">
                            Olá, {user.nome}! {isAdmin ? "👑" : "🏢"}
                        </h2>
                        <p className="desktop-subheading">
                            {isAdmin ? "Painel administrativo e registro pessoal de ponto." : "Registre sua jornada de forma simples e segura."}
                        </p>
                    </div>

                    <button type="button" className="btn btn-soft" onClick={sair}>
                        Sair
                    </button>
                </header>

                <StatusBanner status={status} onClose={limparStatus} />

                {children}
            </main>
        </div>
    );
}

function MobileLayout({
    user,
    isAdmin,
    aba,
    setAba,
    sair,
    status,
    limparStatus,
    buscarEspelho,
    children
}) {
    return (
        <div className="mobile-shell">
            <header className="mobile-header">
                <div className="mobile-header-inner">
                    <div>
                        <h2 className="mobile-title">Olá, {user.nome}! {isAdmin ? "👑" : "🏢"}</h2>
                        <p className="mobile-subtitle">{isAdmin ? "RH e ponto" : "Meu ponto"}</p>
                    </div>

                    <button type="button" className="btn btn-sm btn-soft" onClick={sair}>
                        Sair
                    </button>
                </div>
            </header>

            {isAdmin && (
                <nav className="mobile-tabs" aria-label="Navegação mobile">
                    <button
                        type="button"
                        className={`btn ${aba === "rh" ? "btn-app-primary" : "btn-soft"}`}
                        onClick={() => setAba("rh")}
                    >
                        Gestão RH
                    </button>
                    <button
                        type="button"
                        className={`btn ${aba === "ponto" ? "btn-app-primary" : "btn-soft"}`}
                        onClick={() => {
                            setAba("ponto");
                            buscarEspelho(user.funcionario_id);
                        }}
                    >
                        Meu Ponto
                    </button>
                </nav>
            )}

            <StatusBanner status={status} onClose={limparStatus} />

            {children}
        </div>
    );
}

function Workspace(props) {
    const { user, isAdmin, aba } = props;

    if (isAdmin && aba === "rh") {
        return <EquipePanel {...props} />;
    }

    if (user.perfil === PERFIL_COLABORADOR || aba === "ponto") {
        return <PontoPanel {...props} />;
    }

    return null;
}

function PontoPanel({
    hora,
    espelho,
    baterPonto,
    carregandoPonto,
    carregandoEspelho
}) {
    return (
        <section className="workspace">
            <div className="clock-and-actions">
                <ClockCard hora={hora} />

                <div className="app-card">
                    <div className="app-card-header">
                        <h3 className="card-title">Registrar ponto</h3>
                        <p className="card-description">Use os botões abaixo para registrar entrada ou saída.</p>
                    </div>

                    <div className="app-card-body">
                        <div className="action-grid mb-3">
                            <button
                                type="button"
                                className="btn btn-app-primary"
                                onClick={() => baterPonto("entrada")}
                                disabled={carregandoPonto}
                            >
                                {carregandoPonto ? "Registrando..." : "Entrada"}
                            </button>

                            <button
                                type="button"
                                className="btn btn-app-danger"
                                onClick={() => baterPonto("saida")}
                                disabled={carregandoPonto}
                            >
                                {carregandoPonto ? "Registrando..." : "Saída"}
                            </button>
                        </div>

                        <ResumoEspelho espelho={espelho} carregandoEspelho={carregandoEspelho} />
                    </div>
                </div>
            </div>

            <HistoricoTurnos espelho={espelho} carregandoEspelho={carregandoEspelho} />
        </section>
    );
}

function ClockCard({ hora }) {
    return (
        <div className="app-card clock-card">
            <div className="app-card-body">
                <p className="clock-label">Horário atual</p>
                <h3 className="clock-time">{hora.toLocaleTimeString()}</h3>
                <p className="clock-date">
                    {hora.toLocaleDateString("pt-BR", {
                        weekday: "long",
                        day: "2-digit",
                        month: "long",
                        year: "numeric"
                    })}
                </p>
            </div>
        </div>
    );
}

function ResumoEspelho({ espelho, carregandoEspelho }) {
    const totalHoras = espelho?.resumo?.total_horas_trabalhadas ?? "0";

    return (
        <div className="summary-grid">
            <div className="summary-card">
                <p className="summary-label">Total de horas</p>
                <p className="summary-value">{carregandoEspelho ? "..." : `${totalHoras}h`}</p>
            </div>

            <div className="summary-card">
                <p className="summary-label">Status do espelho</p>
                <p className="summary-value" style={{ fontSize: "1.1rem" }}>
                    {carregandoEspelho ? "Atualizando" : espelho ? "Carregado" : "Pendente"}
                </p>
            </div>
        </div>
    );
}

function EquipePanel({
    equipe,
    espelho,
    colabFocus,
    formCad,
    formJust,
    setFormCad,
    setFormJust,
    buscarEspelho,
    setColabFocus,
    salvarJustificativa,
    gerarPDF,
    carregandoEquipe,
    carregandoEspelho,
    carregandoJustificativa
}) {
    const selecionarColaborador = (funcionario) => {
        setColabFocus(funcionario);
        buscarEspelho(funcionario.id);
    };

    return (
        <section className="admin-grid">
            <div className="workspace">
                <div className="app-card">
                    <div className="app-card-header">
                        <h3 className="card-title">Cadastrar equipe</h3>
                        <p className="card-description">Área visual preservada. O endpoint de cadastro não estava conectado no arquivo original.</p>
                    </div>

                    <div className="app-card-body">
                        <form onSubmit={(e) => e.preventDefault()}>
                            <div className="mb-3">
                                <label className="form-label" htmlFor="cad-nome">Nome</label>
                                <input
                                    id="cad-nome"
                                    type="text"
                                    className="form-control"
                                    placeholder="Nome completo"
                                    value={formCad.nome}
                                    onChange={(e) => setFormCad({ ...formCad, nome: e.target.value })}
                                />
                            </div>

                            <div className="row g-3">
                                <div className="col-12 col-sm-6">
                                    <label className="form-label" htmlFor="cad-cpf">CPF</label>
                                    <input
                                        id="cad-cpf"
                                        type="text"
                                        className="form-control"
                                        placeholder="000.000.000-00"
                                        value={formCad.cpf}
                                        onChange={(e) => setFormCad({ ...formCad, cpf: e.target.value })}
                                    />
                                </div>

                                <div className="col-12 col-sm-6">
                                    <label className="form-label" htmlFor="cad-carga">Carga diária</label>
                                    <select
                                        id="cad-carga"
                                        className="form-select"
                                        value={formCad.carga}
                                        onChange={(e) => setFormCad({ ...formCad, carga: e.target.value })}
                                    >
                                        <option value="6">6 horas</option>
                                        <option value="8">8 horas</option>
                                    </select>
                                </div>
                            </div>

                            <div className="mt-3">
                                <label className="form-label" htmlFor="cad-email">E-mail</label>
                                <input
                                    id="cad-email"
                                    type="email"
                                    className="form-control"
                                    placeholder="colaborador@email.com"
                                    value={formCad.email}
                                    onChange={(e) => setFormCad({ ...formCad, email: e.target.value })}
                                />
                            </div>

                            <div className="mt-3">
                                <label className="form-label" htmlFor="cad-senha">Senha</label>
                                <input
                                    id="cad-senha"
                                    type="password"
                                    className="form-control"
                                    placeholder="Senha inicial"
                                    value={formCad.senha}
                                    onChange={(e) => setFormCad({ ...formCad, senha: e.target.value })}
                                    autoComplete="new-password"
                                />
                            </div>

                            <button type="button" className="btn btn-app-success w-100 mt-3" disabled>
                                Salvar
                            </button>

                            <p className="disabled-note mt-2 mb-0">
                                Mantido desativado para não inventar endpoint ou alterar contrato da API.
                            </p>
                        </form>
                    </div>
                </div>

                <ListaColaboradores
                    equipe={equipe}
                    colabFocus={colabFocus}
                    selecionarColaborador={selecionarColaborador}
                    carregandoEquipe={carregandoEquipe}
                />
            </div>

            <div className="workspace">
                {colabFocus ? (
                    <React.Fragment>
                        <AjusteManual
                            colabFocus={colabFocus}
                            formJust={formJust}
                            setFormJust={setFormJust}
                            salvarJustificativa={salvarJustificativa}
                            gerarPDF={gerarPDF}
                            carregandoJustificativa={carregandoJustificativa}
                            carregandoEspelho={carregandoEspelho}
                        />

                        <HistoricoTurnos espelho={espelho} carregandoEspelho={carregandoEspelho} />
                    </React.Fragment>
                ) : (
                    <div className="app-card">
                        <div className="app-card-body">
                            <div className="empty-state">
                                <strong>Selecione um colaborador</strong>
                                <p>Escolha alguém da lista para visualizar o espelho de ponto e fazer ajustes.</p>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </section>
    );
}

function ListaColaboradores({
    equipe,
    colabFocus,
    selecionarColaborador,
    carregandoEquipe
}) {
    return (
        <div className="app-card">
            <div className="app-card-header">
                <h3 className="card-title">Lista de colaboradores</h3>
                <p className="card-description">Consulte o espelho de ponto individual da equipe.</p>
            </div>

            <div className="app-card-body">
                {carregandoEquipe && (
                    <div className="empty-state">
                        <strong>Carregando equipe...</strong>
                        <p>Aguarde enquanto os colaboradores são buscados.</p>
                    </div>
                )}

                {!carregandoEquipe && equipe.length === 0 && (
                    <div className="empty-state">
                        <strong>Nenhum colaborador encontrado</strong>
                        <p>A API não retornou colaboradores para exibição.</p>
                    </div>
                )}

                {!carregandoEquipe && equipe.length > 0 && (
                    <div className="collaborator-list">
                        {equipe.map((f) => (
                            <div
                                key={f.id}
                                className={`collaborator-item ${colabFocus?.id === f.id ? "active" : ""}`}
                            >
                                <div>
                                    <p className="collaborator-name">{f.nome_completo}</p>
                                    <p className="collaborator-meta">ID: {f.id}</p>
                                </div>

                                <button
                                    type="button"
                                    className="btn btn-sm btn-app-primary"
                                    onClick={() => selecionarColaborador(f)}
                                >
                                    Ver Ponto
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

function AjusteManual({
    colabFocus,
    formJust,
    setFormJust,
    salvarJustificativa,
    gerarPDF,
    carregandoJustificativa,
    carregandoEspelho
}) {
    return (
        <div className="app-card justificativa-box">
            <div className="app-card-header">
                <h3 className="card-title">Ajuste manual para {colabFocus.nome_completo}</h3>
                <p className="card-description">Registre uma correção de ponto com data, tipo e motivo.</p>
            </div>

            <div className="app-card-body">
                <form onSubmit={salvarJustificativa}>
                    <div className="row g-3">
                        <div className="col-12 col-md-5">
                            <label className="form-label" htmlFor="just-data">Data e hora</label>
                            <input
                                id="just-data"
                                type="datetime-local"
                                className="form-control"
                                value={formJust.data}
                                onChange={(e) => setFormJust({ ...formJust, data: e.target.value })}
                                required
                            />
                        </div>

                        <div className="col-12 col-md-3">
                            <label className="form-label" htmlFor="just-tipo">Tipo</label>
                            <select
                                id="just-tipo"
                                className="form-select"
                                value={formJust.tipo}
                                onChange={(e) => setFormJust({ ...formJust, tipo: e.target.value })}
                                required
                            >
                                <option value="entrada">Entrada</option>
                                <option value="saida">Saída</option>
                            </select>
                        </div>

                        <div className="col-12 col-md-4">
                            <label className="form-label" htmlFor="just-motivo">Motivo</label>
                            <input
                                id="just-motivo"
                                type="text"
                                className="form-control"
                                placeholder="Motivo"
                                value={formJust.obs}
                                onChange={(e) => setFormJust({ ...formJust, obs: e.target.value })}
                                required
                            />
                        </div>
                    </div>

                    <div className="d-flex flex-column flex-sm-row gap-2 mt-3">
                        <button
                            type="submit"
                            className="btn btn-app-warning flex-fill"
                            disabled={carregandoJustificativa}
                        >
                            {carregandoJustificativa ? "Salvando..." : "Salvar ajuste"}
                        </button>

                        <button
                            type="button"
                            className="btn btn-app-danger flex-fill"
                            onClick={gerarPDF}
                            disabled={carregandoEspelho}
                        >
                            Gerar PDF
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

function HistoricoTurnos({ espelho, carregandoEspelho }) {
    const detalhesTurnos = Array.isArray(espelho?.detalhes_turnos) ? espelho.detalhes_turnos : [];

    return (
        <div className="app-card">
            <div className="app-card-header">
                <h3 className="card-title">Espelho de ponto</h3>
                <p className="card-description">Histórico retornado pela API para o período consultado.</p>
            </div>

            <div className="app-card-body">
                {carregandoEspelho && (
                    <div className="empty-state">
                        <strong>Atualizando espelho...</strong>
                        <p>Os dados de ponto estão sendo carregados.</p>
                    </div>
                )}

                {!carregandoEspelho && detalhesTurnos.length === 0 && (
                    <div className="empty-state">
                        <strong>Nenhum registro encontrado</strong>
                        <p>Não há turnos disponíveis para exibição no momento.</p>
                    </div>
                )}

                {!carregandoEspelho && detalhesTurnos.length > 0 && (
                    <React.Fragment>
                        <div className="history-table-wrapper d-none d-lg-block">
                            <table className="table history-table">
                                <thead>
                                    <tr>
                                        <th>Ação</th>
                                        <th>Horário</th>
                                        <th>Horas</th>
                                        <th>Observação</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {detalhesTurnos.map((t, index) => (
                                        <tr key={`${t.horario || "turno"}-${index}`}>
                                            <td>{t.acao || "-"}</td>
                                            <td>{t.horario || "-"}</td>
                                            <td>{t.horas_neste_periodo || "-"}</td>
                                            <td>{t.observacao || "-"}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="turnos-mobile d-lg-none">
                            {detalhesTurnos.map((t, index) => (
                                <div className="turno-card" key={`${t.horario || "turno-mobile"}-${index}`}>
                                    <div className="turno-card-top">
                                        <span className="turno-acao">{t.acao || "-"}</span>
                                        <span className="turno-horario">{t.horario || "-"}</span>
                                    </div>
                                    <div>
                                        <strong>Horas:</strong> {t.horas_neste_periodo || "-"}
                                    </div>
                                    <div>
                                        <strong>Obs:</strong> {t.observacao || "-"}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </React.Fragment>
                )}
            </div>
        </div>
    );
}

function StatusBanner({ status, onClose }) {
    if (!status) return null;

    return (
        <div className={`status-banner ${status.tipo || "info"}`} role="status">
            <span>{status.texto}</span>
            <button type="button" className="status-close" onClick={onClose} aria-label="Fechar mensagem">
                ×
            </button>
        </div>
    );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);
