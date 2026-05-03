const { useEffect, useState } = React;

const API_URL = "https://sistema-ponto-backend-a6l8.onrender.com";

const PERFIL_ADMIN = "admin";
const PERFIL_COLABORADOR = "colaborador";

const ADMIN_EMAIL_AUTORIZADO = "joao@empresa.com";
const ADMIN_SENHA_AUTORIZADA = "SenhaSegura123!";

const LOGO_CANDIDATAS = [
    "./assets/img/logo-vie.jpeg",
    "./ativos/logo.png",
    "./ativos/logo.jpg",
    "./ativos/logo.jpeg",
    "./assets/img/logo.png",
    "./assets/img/logo.jpg",
    "./assets/img/logo.jpeg",
    "./assets/img/logo.svg"
];

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

const BATIDAS_JORNADA = [
    {
        tipo: "entrada",
        label: "Entrada",
        descricao: "Início da jornada",
        icone: "↗",
        tom: "primary"
    },
    {
        tipo: "inicio_almoco",
        label: "Início do almoço",
        descricao: "Pausa para refeição",
        icone: "🍽",
        tom: "warning"
    },
    {
        tipo: "volta_almoco",
        label: "Volta do almoço",
        descricao: "Retorno à jornada",
        icone: "↩",
        tom: "success"
    },
    {
        tipo: "saida",
        label: "Saída",
        descricao: "Encerramento do expediente",
        icone: "✓",
        tom: "danger"
    }
];

const FILTROS_ANALISES_INICIAL = {
    inicio: obterPrimeiroDiaMesAtual(),
    fim: obterHojeInput(),
    funcionarioId: "todos",
    cargaDiaria: "8",
    entradaPrevista: "08:00",
    saidaPrevista: "18:00",
    toleranciaMinutos: "10"
};

function obterHojeInput() {
    const agora = new Date();
    const ano = agora.getFullYear();
    const mes = String(agora.getMonth() + 1).padStart(2, "0");
    const dia = String(agora.getDate()).padStart(2, "0");

    return `${ano}-${mes}-${dia}`;
}

function obterPrimeiroDiaMesAtual() {
    const agora = new Date();
    const ano = agora.getFullYear();
    const mes = String(agora.getMonth() + 1).padStart(2, "0");

    return `${ano}-${mes}-01`;
}

function normalizarTexto(valor) {
    return String(valor || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase();
}

function normalizarEmail(valor) {
    return String(valor || "").trim().toLowerCase();
}

function obterConfiguracaoBatida(tipo) {
    return BATIDAS_JORNADA.find((batida) => batida.tipo === tipo) || BATIDAS_JORNADA[0];
}

function obterLabelBatida(tipo) {
    return obterConfiguracaoBatida(tipo).label;
}

function obterTextoTurno(turno) {
    return normalizarTexto([
        turno?.acao,
        turno?.tipo_batida,
        turno?.tipo,
        turno?.descricao,
        turno?.observacao
    ].filter(Boolean).join(" "));
}

function obterTipoTurno(turno) {
    const texto = obterTextoTurno(turno);

    if (!texto) {
        return null;
    }

    if (
        texto.includes("inicio_almoco") ||
        texto.includes("inicio almoco") ||
        texto.includes("inicio do almoco") ||
        texto.includes("saida almoco") ||
        texto.includes("saida para almoco") ||
        (texto.includes("almoco") && (texto.includes("inicio") || texto.includes("pausa") || texto.includes("saida")))
    ) {
        return "inicio_almoco";
    }

    if (
        texto.includes("volta_almoco") ||
        texto.includes("volta almoco") ||
        texto.includes("volta do almoco") ||
        texto.includes("retorno almoco") ||
        texto.includes("retorno do almoco") ||
        (texto.includes("almoco") && (texto.includes("volta") || texto.includes("retorno")))
    ) {
        return "volta_almoco";
    }

    if (texto.includes("saida") || texto.includes("fim") || texto.includes("encerramento")) {
        return "saida";
    }

    if (texto.includes("entrada") || texto.includes("inicio")) {
        return "entrada";
    }

    return null;
}

function formatarAcaoTurno(turno) {
    const tipo = obterTipoTurno(turno);

    if (tipo) {
        return obterLabelBatida(tipo);
    }

    return turno?.acao || turno?.tipo_batida || turno?.tipo || "-";
}

function obterHorarioTurno(turno) {
    return turno?.horario || turno?.data_hora || turno?.data_hora_ajuste || "-";
}

function obterTurnosNormalizados(turnos) {
    if (!Array.isArray(turnos)) {
        return [];
    }

    return turnos
        .map((turno, index) => ({
            turno,
            index,
            tipo: obterTipoTurno(turno),
            data: obterDataDoTurno(turno),
            horarioMinutos: extrairHorarioMinutos(obterHorarioTurno(turno))
        }))
        .filter((item) => item.tipo);
}

function obterJornadaDoDia(espelho) {
    const detalhesTurnos = Array.isArray(espelho?.detalhes_turnos) ? espelho.detalhes_turnos : [];
    const turnosNormalizados = obterTurnosNormalizados(detalhesTurnos);
    const hoje = obterHojeInput();
    const turnosComDataHoje = turnosNormalizados.filter((item) => obterChaveData(item.data) === hoje);
    const base = turnosComDataHoje.length > 0
        ? turnosComDataHoje
        : turnosNormalizados.slice(-4);

    const registrosPorTipo = BATIDAS_JORNADA.reduce((acc, batida) => {
        acc[batida.tipo] = null;
        return acc;
    }, {});

    base.forEach((item) => {
        if (!registrosPorTipo[item.tipo]) {
            registrosPorTipo[item.tipo] = item.turno;
        }
    });

    const proximaBatida = BATIDAS_JORNADA.find((batida) => !registrosPorTipo[batida.tipo]) || null;
    const totalRegistrados = BATIDAS_JORNADA.filter((batida) => registrosPorTipo[batida.tipo]).length;

    return {
        registrosPorTipo,
        proximaBatida,
        totalRegistrados,
        concluida: !proximaBatida,
        usaFallbackUltimosRegistros: turnosComDataHoje.length === 0 && base.length > 0
    };
}

function usuarioTemAcessoAdmin(emailLogin, senhaLogin, dadosUsuario) {
    const emailInformado = normalizarEmail(emailLogin);
    const emailRetornado = normalizarEmail(dadosUsuario?.email || dadosUsuario?.usuario_email || dadosUsuario?.login);

    return dadosUsuario?.perfil === PERFIL_ADMIN &&
        senhaLogin === ADMIN_SENHA_AUTORIZADA &&
        (emailInformado === ADMIN_EMAIL_AUTORIZADO || emailRetornado === ADMIN_EMAIL_AUTORIZADO);
}

function converterHoras(valor) {
    if (typeof valor === "number" && Number.isFinite(valor)) {
        return valor;
    }

    const textoOriginal = String(valor || "").trim();

    if (!textoOriginal || textoOriginal === "-") {
        return 0;
    }

    const texto = textoOriginal
        .replace(",", ".")
        .replace(/horas?/gi, "")
        .replace(/hrs?/gi, "")
        .replace(/h/gi, "")
        .trim();

    const horasMinutos = texto.match(/^(-?\d{1,3}):(\d{2})$/);

    if (horasMinutos) {
        const sinal = horasMinutos[1].startsWith("-") ? -1 : 1;
        const horas = Math.abs(Number(horasMinutos[1]));
        const minutos = Number(horasMinutos[2]);

        return sinal * (horas + minutos / 60);
    }

    const numero = Number.parseFloat(texto.replace(/[^\d.-]/g, ""));

    return Number.isFinite(numero) ? numero : 0;
}

function formatarHoras(valor) {
    const numero = Number(valor || 0);
    const sinal = numero < 0 ? "-" : "";
    const absoluto = Math.abs(numero);

    return `${sinal}${absoluto.toFixed(1).replace(".", ",")}h`;
}

function formatarPercentual(valor) {
    const numero = Number(valor || 0);

    return `${numero.toFixed(1).replace(".", ",")}%`;
}

function converterMinutos(horario) {
    const [hora, minuto] = String(horario || "00:00").split(":").map(Number);

    if (!Number.isFinite(hora) || !Number.isFinite(minuto)) {
        return 0;
    }

    return hora * 60 + minuto;
}

function extrairHorarioMinutos(valor) {
    const texto = String(valor || "");
    const match = texto.match(/(\d{1,2}):(\d{2})/);

    if (!match) {
        return null;
    }

    const hora = Number(match[1]);
    const minuto = Number(match[2]);

    if (!Number.isFinite(hora) || !Number.isFinite(minuto)) {
        return null;
    }

    return hora * 60 + minuto;
}

function converterDataRegistro(valor) {
    if (!valor) {
        return null;
    }

    if (valor instanceof Date && !Number.isNaN(valor.getTime())) {
        return valor;
    }

    const texto = String(valor).trim();

    if (!texto) {
        return null;
    }

    const dataDireta = new Date(texto);

    if (!Number.isNaN(dataDireta.getTime())) {
        return dataDireta;
    }

    const br = texto.match(/(\d{2})\/(\d{2})\/(\d{4})(?:[^\d](\d{1,2}):(\d{2}))?/);

    if (br) {
        const dia = br[1];
        const mes = br[2];
        const ano = br[3];
        const hora = String(br[4] || "00").padStart(2, "0");
        const minuto = String(br[5] || "00").padStart(2, "0");
        const dataBr = new Date(`${ano}-${mes}-${dia}T${hora}:${minuto}:00`);

        return Number.isNaN(dataBr.getTime()) ? null : dataBr;
    }

    const isoCurto = texto.match(/(\d{4})-(\d{2})-(\d{2})(?:[^\d](\d{1,2}):(\d{2}))?/);

    if (isoCurto) {
        const ano = isoCurto[1];
        const mes = isoCurto[2];
        const dia = isoCurto[3];
        const hora = String(isoCurto[4] || "00").padStart(2, "0");
        const minuto = String(isoCurto[5] || "00").padStart(2, "0");
        const dataIso = new Date(`${ano}-${mes}-${dia}T${hora}:${minuto}:00`);

        return Number.isNaN(dataIso.getTime()) ? null : dataIso;
    }

    return null;
}

function obterDataDoTurno(turno) {
    return converterDataRegistro(
        turno?.data_hora ||
        turno?.data_hora_ajuste ||
        turno?.horario ||
        turno?.created_at ||
        turno?.data
    );
}

function obterChaveData(data) {
    if (!data || Number.isNaN(data.getTime())) {
        return null;
    }

    const ano = data.getFullYear();
    const mes = String(data.getMonth() + 1).padStart(2, "0");
    const dia = String(data.getDate()).padStart(2, "0");

    return `${ano}-${mes}-${dia}`;
}

function calcularDiasUteis(inicio, fim) {
    const dataInicio = converterDataRegistro(inicio);
    const dataFim = converterDataRegistro(fim);

    if (!dataInicio || !dataFim || dataInicio > dataFim) {
        return 0;
    }

    const cursor = new Date(dataInicio.getFullYear(), dataInicio.getMonth(), dataInicio.getDate());
    const limite = new Date(dataFim.getFullYear(), dataFim.getMonth(), dataFim.getDate());
    let total = 0;

    while (cursor <= limite) {
        const diaSemana = cursor.getDay();

        if (diaSemana !== 0 && diaSemana !== 6) {
            total += 1;
        }

        cursor.setDate(cursor.getDate() + 1);
    }

    return total;
}

function filtrarTurnosPorPeriodo(turnos, filtros) {
    const dataInicio = converterDataRegistro(filtros.inicio);
    const dataFimBase = converterDataRegistro(filtros.fim);

    if (!Array.isArray(turnos)) {
        return [];
    }

    if (!dataInicio || !dataFimBase) {
        return turnos;
    }

    const dataFim = new Date(dataFimBase.getFullYear(), dataFimBase.getMonth(), dataFimBase.getDate(), 23, 59, 59, 999);

    return turnos.filter((turno) => {
        const dataTurno = obterDataDoTurno(turno);

        if (!dataTurno) {
            return true;
        }

        return dataTurno >= dataInicio && dataTurno <= dataFim;
    });
}

function turnoEhEntrada(turno) {
    return obterTipoTurno(turno) === "entrada";
}

function turnoEhInicioAlmoco(turno) {
    return obterTipoTurno(turno) === "inicio_almoco";
}

function turnoEhVoltaAlmoco(turno) {
    return obterTipoTurno(turno) === "volta_almoco";
}

function turnoEhSaida(turno) {
    return obterTipoTurno(turno) === "saida";
}

function turnoEhAjusteManual(turno) {
    const texto = normalizarTexto(`${turno?.observacao || ""} ${turno?.acao || ""} ${turno?.origem || ""}`);

    return texto.includes("ajuste") || texto.includes("manual") || texto.includes("justific");
}

function montarAnalises(resultados, filtros) {
    const cargaDiaria = Math.max(1, converterHoras(filtros.cargaDiaria || 8));
    const tolerancia = Math.max(0, Number(filtros.toleranciaMinutos || 0));
    const entradaPrevista = converterMinutos(filtros.entradaPrevista || "08:00");
    const saidaPrevista = converterMinutos(filtros.saidaPrevista || "18:00");
    const diasUteis = calcularDiasUteis(filtros.inicio, filtros.fim);
    const horasPrevistasBase = diasUteis * cargaDiaria;

    const colaboradores = resultados.map((resultado) => {
        const funcionario = resultado.funcionario;
        const espelho = resultado.espelho;
        const turnosOriginais = Array.isArray(espelho?.detalhes_turnos) ? espelho.detalhes_turnos : [];
        const turnos = filtrarTurnosPorPeriodo(turnosOriginais, filtros);
        const totalResumo = converterHoras(espelho?.resumo?.total_horas_trabalhadas);
        const totalTurnos = turnos.reduce((total, turno) => total + converterHoras(turno?.horas_neste_periodo), 0);
        const horasTrabalhadas = totalTurnos > 0 ? totalTurnos : totalResumo;
        const diasComRegistro = new Set();

        turnos.forEach((turno) => {
            const dataTurno = obterDataDoTurno(turno);
            const chave = obterChaveData(dataTurno);

            if (chave) {
                diasComRegistro.add(chave);
            }
        });

        const diasRegistradosCalculados = diasComRegistro.size || Math.min(diasUteis, Math.ceil(horasTrabalhadas / cargaDiaria));
        const faltasEstimadas = Math.max(0, diasUteis - diasRegistradosCalculados);
        const entradas = turnos.filter(turnoEhEntrada);
        const iniciosAlmoco = turnos.filter(turnoEhInicioAlmoco);
        const voltasAlmoco = turnos.filter(turnoEhVoltaAlmoco);
        const saidas = turnos.filter(turnoEhSaida);

        const atrasos = entradas.filter((turno) => {
            const minutos = extrairHorarioMinutos(obterHorarioTurno(turno));

            return minutos !== null && minutos > entradaPrevista + tolerancia;
        }).length;

        const saidasAntecipadas = saidas.filter((turno) => {
            const minutos = extrairHorarioMinutos(obterHorarioTurno(turno));

            return minutos !== null && minutos < saidaPrevista - tolerancia;
        }).length;

        const ajustesManuais = turnos.filter(turnoEhAjusteManual).length;
        const intervaloIncompleto = iniciosAlmoco.length !== voltasAlmoco.length;
        const pontoIncompleto = entradas.length !== saidas.length || intervaloIncompleto;
        const horasPrevistas = horasPrevistasBase;
        const saldoHoras = horasTrabalhadas - horasPrevistas;
        const absenteismoPercentual = horasPrevistas > 0 ? Math.min(100, (faltasEstimadas * cargaDiaria / horasPrevistas) * 100) : 0;
        const ocorrencias = faltasEstimadas + atrasos + saidasAntecipadas + ajustesManuais + (pontoIncompleto ? 1 : 0);
        const status = saldoHoras < -8 || absenteismoPercentual >= 15 || pontoIncompleto
            ? "crítico"
            : saldoHoras < 0 || absenteismoPercentual > 0 || atrasos > 0 || saidasAntecipadas > 0
                ? "atenção"
                : "regular";

        return {
            id: funcionario.id,
            nome: funcionario.nome_completo || funcionario.nome || `Funcionário ${funcionario.id}`,
            horasPrevistas,
            horasTrabalhadas,
            saldoHoras,
            faltasEstimadas,
            atrasos,
            iniciosAlmoco: iniciosAlmoco.length,
            voltasAlmoco: voltasAlmoco.length,
            intervalosIncompletos: intervaloIncompleto ? 1 : 0,
            saidasAntecipadas,
            ajustesManuais,
            pontoIncompleto,
            absenteismoPercentual,
            ocorrencias,
            status,
            erro: resultado.erro || null
        };
    });

    const resumo = colaboradores.reduce((acc, colaborador) => {
        acc.totalColaboradores += 1;
        acc.horasPrevistas += colaborador.horasPrevistas;
        acc.horasTrabalhadas += colaborador.horasTrabalhadas;
        acc.saldoHoras += colaborador.saldoHoras;
        acc.faltasEstimadas += colaborador.faltasEstimadas;
        acc.atrasos += colaborador.atrasos;
        acc.iniciosAlmoco += colaborador.iniciosAlmoco;
        acc.voltasAlmoco += colaborador.voltasAlmoco;
        acc.intervalosIncompletos += colaborador.intervalosIncompletos;
        acc.saidasAntecipadas += colaborador.saidasAntecipadas;
        acc.ajustesManuais += colaborador.ajustesManuais;
        acc.pontosIncompletos += colaborador.pontoIncompleto ? 1 : 0;
        acc.ocorrencias += colaborador.ocorrencias;

        return acc;
    }, {
        totalColaboradores: 0,
        horasPrevistas: 0,
        horasTrabalhadas: 0,
        saldoHoras: 0,
        faltasEstimadas: 0,
        atrasos: 0,
        iniciosAlmoco: 0,
        voltasAlmoco: 0,
        intervalosIncompletos: 0,
        saidasAntecipadas: 0,
        ajustesManuais: 0,
        pontosIncompletos: 0,
        ocorrencias: 0
    });

    resumo.absenteismoPercentual = resumo.horasPrevistas > 0
        ? Math.min(100, (resumo.faltasEstimadas * cargaDiaria / resumo.horasPrevistas) * 100)
        : 0;

    const rankingAbsenteismo = [...colaboradores]
        .sort((a, b) => b.ocorrencias - a.ocorrencias || b.absenteismoPercentual - a.absenteismoPercentual)
        .slice(0, 5);

    const ocorrencias = colaboradores.flatMap((colaborador) => {
        const lista = [];

        if (colaborador.erro) {
            lista.push({
                funcionario: colaborador.nome,
                tipo: "Falha de leitura",
                descricao: colaborador.erro,
                severidade: "crítica"
            });
        }

        if (colaborador.faltasEstimadas > 0) {
            lista.push({
                funcionario: colaborador.nome,
                tipo: "Faltas estimadas",
                descricao: `${colaborador.faltasEstimadas} dia(s) útil(eis) sem registro dentro do período filtrado.`,
                severidade: colaborador.faltasEstimadas >= 3 ? "crítica" : "atenção"
            });
        }

        if (colaborador.atrasos > 0) {
            lista.push({
                funcionario: colaborador.nome,
                tipo: "Atrasos",
                descricao: `${colaborador.atrasos} entrada(s) após a tolerância configurada.`,
                severidade: "atenção"
            });
        }

        if (colaborador.saidasAntecipadas > 0) {
            lista.push({
                funcionario: colaborador.nome,
                tipo: "Saídas antecipadas",
                descricao: `${colaborador.saidasAntecipadas} saída(s) antes do horário esperado.`,
                severidade: "atenção"
            });
        }

        if (colaborador.intervalosIncompletos > 0) {
            lista.push({
                funcionario: colaborador.nome,
                tipo: "Intervalo incompleto",
                descricao: "Há início de almoço sem volta correspondente, ou volta sem início de almoço.",
                severidade: "crítica"
            });
        }

        if (colaborador.pontoIncompleto) {
            lista.push({
                funcionario: colaborador.nome,
                tipo: "Ponto incompleto",
                descricao: "Quantidade de registros principais ou de intervalo não está equilibrada no espelho retornado.",
                severidade: "crítica"
            });
        }

        return lista;
    }).slice(0, 12);

    return {
        periodo: {
            inicio: filtros.inicio,
            fim: filtros.fim,
            diasUteis,
            cargaDiaria
        },
        resumo,
        colaboradores,
        rankingAbsenteismo,
        ocorrencias,
        geradoEm: new Date()
    };
}

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
    const [filtrosAnalises, setFiltrosAnalises] = useState(FILTROS_ANALISES_INICIAL);
    const [analises, setAnalises] = useState(null);
    const [analisesAtualizadasEm, setAnalisesAtualizadasEm] = useState(null);
    const [adminAutorizado, setAdminAutorizado] = useState(false);
    const [modalColaboradorAberto, setModalColaboradorAberto] = useState(false);

    const [status, setStatus] = useState(null);
    const [carregandoLogin, setCarregandoLogin] = useState(false);
    const [carregandoEquipe, setCarregandoEquipe] = useState(false);
    const [carregandoEspelho, setCarregandoEspelho] = useState(false);
    const [carregandoPonto, setCarregandoPonto] = useState(false);
    const [carregandoJustificativa, setCarregandoJustificativa] = useState(false);
    const [carregandoAnalises, setCarregandoAnalises] = useState(false);

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

    useEffect(() => {
        if (user?.perfil === PERFIL_ADMIN && adminAutorizado && aba === "analises" && !analises && !carregandoAnalises) {
            buscarAnalises();
        }
    }, [user, adminAutorizado, aba, analises, carregandoAnalises]);

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

            const acessoAdminConfirmado = usuarioTemAcessoAdmin(emailLogin, senha, data);

            setUser(data);
            setAdminAutorizado(acessoAdminConfirmado);
            setAba(acessoAdminConfirmado ? "rh" : "ponto");
            setStatus(null);

            if (acessoAdminConfirmado) {
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
            const lista = Array.isArray(data) ? data : [];

            setEquipe(lista);

            return lista;
        } catch (error) {
            setEquipe([]);
            setMensagem("error", error.message);

            return [];
        } finally {
            setCarregandoEquipe(false);
        }
    };

    const buscarEspelho = async (id) => {
        if (!id) return null;

        setCarregandoEspelho(true);

        try {
            const data = await requestJson(`/espelho-ponto/${id}`);
            setEspelho(data);

            return data;
        } catch (error) {
            setEspelho(null);
            setMensagem("error", error.message);

            return null;
        } finally {
            setCarregandoEspelho(false);
        }
    };

    const buscarAnalises = async () => {
        if (carregandoAnalises) return;

        setCarregandoAnalises(true);
        setStatus(null);

        try {
            const equipeAtual = equipe.length > 0 ? equipe : await buscarEquipe();
            const funcionariosParaAnalise = filtrosAnalises.funcionarioId === "todos"
                ? equipeAtual
                : equipeAtual.filter((funcionario) => String(funcionario.id) === String(filtrosAnalises.funcionarioId));

            const resultados = await Promise.all(funcionariosParaAnalise.map(async (funcionario) => {
                try {
                    const espelhoFuncionario = await requestJson(`/espelho-ponto/${funcionario.id}`);

                    return {
                        funcionario,
                        espelho: espelhoFuncionario,
                        erro: null
                    };
                } catch (error) {
                    return {
                        funcionario,
                        espelho: null,
                        erro: error.message
                    };
                }
            }));

            const dadosAnalises = montarAnalises(resultados, filtrosAnalises);

            setAnalises(dadosAnalises);
            setAnalisesAtualizadasEm(new Date());

            if (resultados.length === 0) {
                setMensagem("info", "Nenhum colaborador disponível para análise.");
            }
        } catch (error) {
            setAnalises(null);
            setMensagem("error", error.message);
        } finally {
            setCarregandoAnalises(false);
        }
    };

    const exportarAnalisesCSV = () => {
        if (!analises?.colaboradores?.length) {
            alert("Não há análises carregadas para exportar.");
            return;
        }

        const cabecalho = [
            "Colaborador",
            "Horas previstas",
            "Horas trabalhadas",
            "Saldo",
            "Faltas estimadas",
            "Atrasos",
            "Inícios de almoço",
            "Voltas de almoço",
            "Intervalos incompletos",
            "Saídas antecipadas",
            "Ajustes manuais",
            "Absenteísmo",
            "Status"
        ];

        const linhas = analises.colaboradores.map((colaborador) => [
            colaborador.nome,
            colaborador.horasPrevistas.toFixed(2),
            colaborador.horasTrabalhadas.toFixed(2),
            colaborador.saldoHoras.toFixed(2),
            colaborador.faltasEstimadas,
            colaborador.atrasos,
            colaborador.iniciosAlmoco,
            colaborador.voltasAlmoco,
            colaborador.intervalosIncompletos,
            colaborador.saidasAntecipadas,
            colaborador.ajustesManuais,
            colaborador.absenteismoPercentual.toFixed(2),
            colaborador.status
        ]);

        const conteudo = [cabecalho, ...linhas]
            .map((linha) => linha.map((valor) => `"${String(valor).replace(/"/g, '""')}"`).join(";"))
            .join("\n");

        const blob = new Blob([`\ufeff${conteudo}`], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");

        link.href = url;
        link.download = `analises-ponto-${analises.periodo.inicio}-${analises.periodo.fim}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
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
            setAnalises(null);
            setMensagem("success", `${obterLabelBatida(tipo)} registrada com sucesso.`);
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
            setAnalises(null);
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
            formatarAcaoTurno(t),
            obterHorarioTurno(t),
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

    const isAdmin = user.perfil === PERFIL_ADMIN && adminAutorizado;

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
            filtrosAnalises={filtrosAnalises}
            analises={analises}
            analisesAtualizadasEm={analisesAtualizadasEm}
            setFormCad={setFormCad}
            setFormJust={setFormJust}
            setFiltrosAnalises={setFiltrosAnalises}
            modalColaboradorAberto={modalColaboradorAberto}
            setModalColaboradorAberto={setModalColaboradorAberto}
            buscarEspelho={buscarEspelho}
            buscarAnalises={buscarAnalises}
            exportarAnalisesCSV={exportarAnalisesCSV}
            setColabFocus={setColabFocus}
            baterPonto={baterPonto}
            salvarJustificativa={salvarJustificativa}
            gerarPDF={gerarPDF}
            carregandoEquipe={carregandoEquipe}
            carregandoEspelho={carregandoEspelho}
            carregandoPonto={carregandoPonto}
            carregandoJustificativa={carregandoJustificativa}
            carregandoAnalises={carregandoAnalises}
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

function BrandLogo({ className = "", compact = false }) {
    const [indiceLogo, setIndiceLogo] = useState(0);
    const srcAtual = LOGO_CANDIDATAS[indiceLogo];

    const tentarProximaLogo = () => {
        if (indiceLogo < LOGO_CANDIDATAS.length - 1) {
            setIndiceLogo(indiceLogo + 1);
        }
    };

    return (
        <span className={`brand-logo ${compact ? "compact" : ""} ${className}`.trim()}>
            {srcAtual ? (
                <img
                    src={srcAtual}
                    alt="Logo Vie Medicina e Saúde"
                    onError={tentarProximaLogo}
                />
            ) : (
                <span>Vie</span>
            )}
        </span>
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
    const [mostrarSenha, setMostrarSenha] = useState(false);

    return (
        <main className="safe-page auth-page auth-page-modern brand-auth private-auth-page">
            <section className="private-login-shell" aria-label="Portal interno Vie Ponto ERP">
                <aside className="private-login-identity">
                    <div className="private-identity-top">
                        <div className="auth-logo-group private-logo-group">
                            <BrandLogo className="auth-logo private-identity-logo" />
                            <div>
                                <strong>Vie Medicina e Saúde</strong>
                                <span>Portal interno de jornada</span>
                            </div>
                        </div>

                        <span className="private-status-pill">
                            <span className="private-status-dot"></span>
                            Ambiente privado
                        </span>
                    </div>

                    <div className="private-identity-content">
                        <p className="private-eyebrow">Acesso exclusivo</p>
                        <h1>Área interna para equipe autorizada.</h1>
                        <p>
                            Registro de ponto, jornada, análises e gestão operacional em um
                            ambiente reservado para colaboradores, RH e administradores da Vie.
                        </p>
                    </div>

                    <div className="private-app-preview" aria-hidden="true">
                        <div className="preview-window-bar">
                            <span></span>
                            <span></span>
                            <span></span>
                        </div>

                        <div className="preview-secure-row">
                            <span>🔐</span>
                            <div>
                                <strong>Sessão segura</strong>
                                <small>Validação pela API principal</small>
                            </div>
                        </div>

                        <div className="preview-grid">
                            <div className="preview-card large">
                                <small>Hoje</small>
                                <strong>Jornada ativa</strong>
                                <span>Entrada · Saída · Espelho</span>
                            </div>
                            <div className="preview-card">
                                <small>Horas</small>
                                <strong>42,5h</strong>
                            </div>
                            <div className="preview-card accent">
                                <small>Status</small>
                                <strong>Online</strong>
                            </div>
                        </div>
                    </div>

                    <div className="private-login-footnote">
                        <span>🩺</span>
                        <p>Identidade Vie aplicada ao ERP de ponto com foco em privacidade e operação interna.</p>
                    </div>
                </aside>

                <section className="private-login-panel">
                    <div className="private-access-card">
                        <div className="private-card-top">
                            <BrandLogo className="private-card-logo" compact />
                            <span className="private-lock-badge">Acesso restrito</span>
                        </div>

                        <div className="private-card-heading">
                            <p className="private-eyebrow">Identificação obrigatória</p>
                            <h2>Entrar no ambiente interno</h2>
                            <p>Use suas credenciais corporativas para acessar seu painel.</p>
                        </div>

                        <StatusBanner status={status} onClose={limparStatus} />

                        <form onSubmit={login} className="private-login-form">
                            <div className="private-field-group">
                                <label className="form-label" htmlFor="login-email">E-mail corporativo</label>
                                <div className="private-input-shell">
                                    <span className="private-input-icon">@</span>
                                    <input
                                        id="login-email"
                                        type="email"
                                        className="form-control form-control-lg private-input"
                                        placeholder="nome@empresa.com"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        autoComplete="email"
                                        inputMode="email"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="private-field-group">
                                <label className="form-label" htmlFor="login-senha">Senha de acesso</label>
                                <div className="private-input-shell">
                                    <span className="private-input-icon">••</span>
                                    <input
                                        id="login-senha"
                                        type={mostrarSenha ? "text" : "password"}
                                        className="form-control form-control-lg private-input private-password-input"
                                        placeholder="Digite sua senha"
                                        value={senha}
                                        onChange={(e) => setSenha(e.target.value)}
                                        autoComplete="current-password"
                                        required
                                    />
                                    <button
                                        type="button"
                                        className="private-password-toggle"
                                        onClick={() => setMostrarSenha((valorAtual) => !valorAtual)}
                                        aria-label={mostrarSenha ? "Ocultar senha" : "Mostrar senha"}
                                    >
                                        {mostrarSenha ? "Ocultar" : "Mostrar"}
                                    </button>
                                </div>
                            </div>

                            <button
                                type="submit"
                                className="btn btn-app-primary btn-lg w-100 private-login-submit"
                                disabled={carregandoLogin}
                            >
                                {carregandoLogin && <span className="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>}
                                {carregandoLogin ? "Validando credenciais..." : "Acessar portal interno"}
                            </button>

                            <div className="private-access-note">
                                <strong>Portal privado.</strong>
                                <span>Administrador/RH só é liberado para a credencial autorizada.</span>
                            </div>
                        </form>
                    </div>

                    <p className="private-compliance-note">
                        Ao entrar, você acessa dados internos de jornada. Use apenas em dispositivo confiável.
                    </p>
                </section>
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
        <div className="desktop-shell erp-desktop-shell">
            <aside className="sidebar erp-sidebar">
                <div className="sidebar-brand">
                    <BrandLogo compact />
                    <div>
                        <h1>Vie Medicina e Saúde</h1>
                        <p>ERP de ponto</p>
                    </div>
                </div>

                <div className="sidebar-profile erp-user-card">
                    <span>Usuário</span>
                    <strong>{user.nome}</strong>
                    <small>{isAdmin ? "Administrador/RH" : "Colaborador"}</small>
                </div>

                {isAdmin && (
                    <nav className="sidebar-nav erp-nav" aria-label="Navegação principal">
                        <button
                            type="button"
                            className={`btn ${aba === "rh" ? "btn-light" : "btn-outline-light"}`}
                            onClick={() => setAba("rh")}
                        >
                            <span className="nav-icon">👥</span>
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
                            <span className="nav-icon">⏰</span>
                            Meu Ponto
                        </button>
                        <button
                            type="button"
                            className={`btn ${aba === "analises" ? "btn-light" : "btn-outline-light"}`}
                            onClick={() => setAba("analises")}
                        >
                            <span className="nav-icon">📊</span>
                            Análises
                        </button>
                    </nav>
                )}

                <div className="erp-sidebar-bottom">
                    <span className="erp-chip">Online</span>
                    <p>Operação conectada ao backend principal.</p>
                </div>
            </aside>

            <main className="desktop-main erp-main">
                <header className="desktop-topbar erp-topbar">
                    <div>
                        <p className="eyebrow mb-1">Painel operacional</p>
                        <h2 className="desktop-heading">
                            Olá, {user.nome}! {isAdmin ? "👑" : "🏢"}
                        </h2>
                        <p className="desktop-subheading">
                            {isAdmin ? "Gestão de equipe, ponto, análises e ocorrências em uma visão ERP." : "Registre sua jornada de forma simples e segura."}
                        </p>
                    </div>

                    <div className="topbar-actions">
                        <span className="erp-chip soft">{isAdmin ? "Administrador/RH" : "Colaborador"}</span>
                        <button type="button" className="btn btn-soft" onClick={sair}>
                            Sair
                        </button>
                    </div>
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
        <div className="mobile-shell mobile-native-shell">
            <header className="mobile-header mobile-native-header">
                <div className="mobile-header-inner">
                    <div className="mobile-brand-title">
                        <BrandLogo compact />
                        <div>
                            <p className="mobile-eyebrow">{isAdmin ? "Painel RH" : "Meu app de ponto"}</p>
                            <h2 className="mobile-title">Olá, {user.nome}! {isAdmin ? "👑" : "💚"}</h2>
                            <p className="mobile-subtitle">{isAdmin ? "Equipe, ponto e análises" : "Sua jornada em tempo real"}</p>
                        </div>
                    </div>

                    <button type="button" className="btn btn-sm btn-soft mobile-logout" onClick={sair}>
                        Sair
                    </button>
                </div>
            </header>

            <MobileSocialStrip isAdmin={isAdmin} aba={aba} />

            <StatusBanner status={status} onClose={limparStatus} />

            {children}

            <nav className={`mobile-tabs mobile-tabs-erp mobile-bottom-nav ${isAdmin ? "admin" : "collab"}`} aria-label="Navegação mobile">
                {isAdmin ? (
                    <React.Fragment>
                        <button
                            type="button"
                            className={`btn ${aba === "rh" ? "btn-app-primary" : "btn-soft"}`}
                            onClick={() => setAba("rh")}
                        >
                            <span className="mobile-nav-icon">👥</span>
                            <span>RH</span>
                        </button>
                        <button
                            type="button"
                            className={`btn ${aba === "ponto" ? "btn-app-primary" : "btn-soft"}`}
                            onClick={() => {
                                setAba("ponto");
                                buscarEspelho(user.funcionario_id);
                            }}
                        >
                            <span className="mobile-nav-icon">⏱</span>
                            <span>Ponto</span>
                        </button>
                        <button
                            type="button"
                            className={`btn ${aba === "analises" ? "btn-app-primary" : "btn-soft"}`}
                            onClick={() => setAba("analises")}
                        >
                            <span className="mobile-nav-icon">📊</span>
                            <span>Análises</span>
                        </button>
                    </React.Fragment>
                ) : (
                    <React.Fragment>
                        <button
                            type="button"
                            className="btn btn-app-primary"
                            onClick={() => buscarEspelho(user.funcionario_id)}
                        >
                            <span className="mobile-nav-icon">⏱</span>
                            <span>Meu ponto</span>
                        </button>
                        <button
                            type="button"
                            className="btn btn-soft"
                            onClick={() => buscarEspelho(user.funcionario_id)}
                        >
                            <span className="mobile-nav-icon">🔄</span>
                            <span>Atualizar</span>
                        </button>
                    </React.Fragment>
                )}
            </nav>
        </div>
    );
}

function MobileSocialStrip({ isAdmin, aba }) {
    const itens = isAdmin
        ? [
            { icone: "👥", titulo: "Equipe", detalhe: aba === "rh" ? "aberto" : "RH" },
            { icone: "⏱", titulo: "Ponto", detalhe: aba === "ponto" ? "agora" : "meu" },
            { icone: "📊", titulo: "Análises", detalhe: aba === "analises" ? "ativa" : "ERP" },
            { icone: "🧾", titulo: "Relatórios", detalhe: "PDF" }
        ]
        : [
            { icone: "💚", titulo: "Bem-estar", detalhe: "Vie" },
            { icone: "⏱", titulo: "Ponto", detalhe: "online" },
            { icone: "📈", titulo: "Horas", detalhe: "mês" },
            { icone: "🌿", titulo: "Folgas", detalhe: "escala" }
        ];

    return (
        <section className="mobile-social-strip" aria-label="Atalhos rápidos">
            {itens.map((item) => (
                <div className="mobile-story" key={`${item.titulo}-${item.detalhe}`}>
                    <span className="mobile-story-avatar">{item.icone}</span>
                    <strong>{item.titulo}</strong>
                    <small>{item.detalhe}</small>
                </div>
            ))}
        </section>
    );
}


function Workspace(props) {
    const { user, isAdmin, aba } = props;

    if (isAdmin && aba === "rh") {
        return <EquipePanel {...props} />;
    }

    if (isAdmin && aba === "analises") {
        return <AnalyticsPanel {...props} />;
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
    const jornadaDoDia = obterJornadaDoDia(espelho);

    return (
        <section className="workspace ponto-workspace">
            <div className="clock-and-actions">
                <ClockCard hora={hora} />

                <div className="app-card jornada-card">
                    <div className="app-card-header">
                        <h3 className="card-title">Jornada do dia</h3>
                        <p className="card-description">
                            Registre entrada, início do almoço, volta do almoço e saída em uma sequência orientada.
                        </p>
                    </div>

                    <div className="app-card-body">
                        <JornadaPontoActions
                            jornadaDoDia={jornadaDoDia}
                            baterPonto={baterPonto}
                            carregandoPonto={carregandoPonto}
                        />

                        <ResumoEspelho espelho={espelho} carregandoEspelho={carregandoEspelho} />
                    </div>
                </div>
            </div>

            <AnalisePessoal espelho={espelho} carregandoEspelho={carregandoEspelho} />

            <HistoricoTurnos espelho={espelho} carregandoEspelho={carregandoEspelho} />
        </section>
    );
}

function JornadaPontoActions({
    jornadaDoDia,
    baterPonto,
    carregandoPonto
}) {
    const proximaBatida = jornadaDoDia.proximaBatida;

    return (
        <div className="journey-control">
            <div className="journey-next-action">
                <div>
                    <span className="journey-next-label">
                        {jornadaDoDia.concluida ? "Jornada concluída" : "Próximo registro recomendado"}
                    </span>
                    <strong>
                        {jornadaDoDia.concluida ? "Todos os pontos principais foram registrados" : proximaBatida.label}
                    </strong>
                    <p>
                        {jornadaDoDia.concluida
                            ? "Confira o espelho abaixo para validar os horários do dia."
                            : proximaBatida.descricao}
                    </p>
                </div>

                {!jornadaDoDia.concluida && (
                    <button
                        type="button"
                        className="btn btn-app-primary journey-primary-button"
                        onClick={() => baterPonto(proximaBatida.tipo)}
                        disabled={carregandoPonto}
                    >
                        {carregandoPonto ? "Registrando..." : `Registrar ${proximaBatida.label.toLowerCase()}`}
                    </button>
                )}
            </div>

            <div className="journey-timeline" aria-label="Linha do tempo da jornada">
                {BATIDAS_JORNADA.map((batida) => {
                    const registro = jornadaDoDia.registrosPorTipo[batida.tipo];
                    const isNext = proximaBatida?.tipo === batida.tipo;
                    const horario = registro ? obterHorarioTurno(registro) : null;

                    return (
                        <div
                            key={batida.tipo}
                            className={`journey-step ${registro ? "done" : ""} ${isNext ? "current" : ""}`}
                        >
                            <span className="journey-step-icon">{registro ? "✓" : batida.icone}</span>
                            <div>
                                <strong>{batida.label}</strong>
                                <small>{registro ? horario : isNext ? "Próximo" : "Pendente"}</small>
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="journey-action-grid">
                {BATIDAS_JORNADA.map((batida) => {
                    const isNext = proximaBatida?.tipo === batida.tipo;
                    const registro = jornadaDoDia.registrosPorTipo[batida.tipo];

                    return (
                        <button
                            type="button"
                            key={`btn-${batida.tipo}`}
                            className={`journey-action-button ${batida.tom} ${isNext ? "recommended" : ""} ${registro ? "registered" : ""}`}
                            onClick={() => baterPonto(batida.tipo)}
                            disabled={carregandoPonto}
                        >
                            <span>{batida.icone}</span>
                            <strong>{batida.label}</strong>
                            <small>{registro ? "Já registrado" : isNext ? "Recomendado" : "Disponível"}</small>
                        </button>
                    );
                })}
            </div>

            {jornadaDoDia.usaFallbackUltimosRegistros && (
                <p className="journey-note">
                    A API não retornou data completa em todos os registros. A sequência usa os últimos lançamentos como referência visual.
                </p>
            )}
        </div>
    );
}

function ClockCard({ hora }) {
    return (
        <div className="app-card clock-card erp-clock-card">
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


function AnalisePessoal({ espelho, carregandoEspelho }) {
    const detalhesTurnos = Array.isArray(espelho?.detalhes_turnos) ? espelho.detalhes_turnos : [];
    const entradas = detalhesTurnos.filter(turnoEhEntrada).length;
    const iniciosAlmoco = detalhesTurnos.filter(turnoEhInicioAlmoco).length;
    const voltasAlmoco = detalhesTurnos.filter(turnoEhVoltaAlmoco).length;
    const saidas = detalhesTurnos.filter(turnoEhSaida).length;
    const ajustes = detalhesTurnos.filter(turnoEhAjusteManual).length;
    const pendenciasJornada = Math.abs(entradas - saidas);
    const pendenciasIntervalo = Math.abs(iniciosAlmoco - voltasAlmoco);
    const pontosIncompletos = pendenciasJornada + pendenciasIntervalo;
    const totalHoras = espelho?.resumo?.total_horas_trabalhadas ?? "0";
    const folgas = espelho?.resumo?.folgas ?? espelho?.resumo?.total_folgas ?? espelho?.resumo?.dias_folga ?? null;

    return (
        <div className="app-card personal-analytics-card">
            <div className="app-card-header">
                <h3 className="card-title">Minha análise de jornada</h3>
                <p className="card-description">
                    Visão individual com entrada, almoço, retorno, saída e demais registros retornados pelo espelho.
                </p>
            </div>

            <div className="app-card-body">
                <div className="personal-kpi-grid">
                    <div className="summary-card">
                        <p className="summary-label">Horas trabalhadas</p>
                        <p className="summary-value">{carregandoEspelho ? "..." : `${totalHoras}h`}</p>
                    </div>

                    <div className="summary-card">
                        <p className="summary-label">Registros no espelho</p>
                        <p className="summary-value">{carregandoEspelho ? "..." : detalhesTurnos.length}</p>
                    </div>

                    <div className="summary-card">
                        <p className="summary-label">Entrada/Saída</p>
                        <p className="summary-value small-value">{carregandoEspelho ? "..." : `${entradas}/${saidas}`}</p>
                    </div>

                    <div className="summary-card">
                        <p className="summary-label">Almoço/Retorno</p>
                        <p className="summary-value small-value">{carregandoEspelho ? "..." : `${iniciosAlmoco}/${voltasAlmoco}`}</p>
                    </div>

                    <div className={`summary-card ${pontosIncompletos > 0 ? "attention" : ""}`}>
                        <p className="summary-label">Pendências</p>
                        <p className="summary-value">{carregandoEspelho ? "..." : pontosIncompletos}</p>
                    </div>

                    <div className="summary-card">
                        <p className="summary-label">Ajustes manuais</p>
                        <p className="summary-value">{carregandoEspelho ? "..." : ajustes}</p>
                    </div>

                    <div className="summary-card">
                        <p className="summary-label">Folgas</p>
                        <p className="summary-value small-value">
                            {carregandoEspelho ? "..." : (folgas === null ? "Não informado" : folgas)}
                        </p>
                    </div>
                </div>

                {folgas === null && !carregandoEspelho && (
                    <p className="personal-note">
                        Folgas dependem de escala/calendário retornados pelo backend. A tela já está preparada para exibir esse dado quando a API enviar.
                    </p>
                )}
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
    modalColaboradorAberto,
    setModalColaboradorAberto,
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
        <React.Fragment>
            <section className="erp-page-header">
                <div>
                    <p className="eyebrow">Gestão RH</p>
                    <h3>Colaboradores e espelho de ponto</h3>
                    <span>Gerencie consultas, ajustes manuais e relatórios sem poluir a tela principal.</span>
                </div>

                <button
                    type="button"
                    className="btn btn-sm btn-outline-brand subtle-action"
                    onClick={() => setModalColaboradorAberto(true)}
                >
                    + Novo colaborador
                </button>
            </section>

            <section className="admin-grid admin-grid-erp">
                <div className="workspace">
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

            <CadastroColaboradorModal
                aberto={modalColaboradorAberto}
                fechar={() => setModalColaboradorAberto(false)}
                formCad={formCad}
                setFormCad={setFormCad}
            />
        </React.Fragment>
    );
}

function CadastroColaboradorModal({
    aberto,
    fechar,
    formCad,
    setFormCad
}) {
    if (!aberto) return null;

    return (
        <div className="app-modal-backdrop" role="presentation">
            <section className="app-modal" role="dialog" aria-modal="true" aria-labelledby="modal-colaborador-title">
                <header className="app-modal-header">
                    <div>
                        <p className="eyebrow">Cadastro</p>
                        <h3 id="modal-colaborador-title">Novo colaborador</h3>
                        <span>Preencha os dados básicos. O salvamento será ativado quando o endpoint de cadastro estiver conectado.</span>
                    </div>

                    <button type="button" className="modal-close" onClick={fechar} aria-label="Fechar modal">
                        ×
                    </button>
                </header>

                <form className="app-modal-body" onSubmit={(e) => e.preventDefault()}>
                    <div className="mb-3">
                        <label className="form-label" htmlFor="cad-nome">Nome completo</label>
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
                        <label className="form-label" htmlFor="cad-senha">Senha inicial</label>
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

                    <footer className="app-modal-footer">
                        <button type="button" className="btn btn-soft" onClick={fechar}>
                            Cancelar
                        </button>

                        <button type="button" className="btn btn-app-success" disabled>
                            Salvar colaborador
                        </button>
                    </footer>

                    <p className="disabled-note mt-2 mb-0">
                        Botão mantido desativado para não inventar endpoint nem alterar contrato da API atual.
                    </p>
                </form>
            </section>
        </div>
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
                                {BATIDAS_JORNADA.map((batida) => (
                                    <option key={`ajuste-${batida.tipo}`} value={batida.tipo}>
                                        {batida.label}
                                    </option>
                                ))}
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

function AnalyticsPanel({
    equipe,
    filtrosAnalises,
    setFiltrosAnalises,
    analises,
    analisesAtualizadasEm,
    buscarAnalises,
    exportarAnalisesCSV,
    carregandoAnalises
}) {
    const resumo = analises?.resumo;

    return (
        <section className="workspace analytics-workspace">
            <div className="analytics-hero app-card">
                <div>
                    <p className="eyebrow">Nova central gerencial</p>
                    <h3>Análises, absenteísmo e gestão de horas</h3>
                    <p>
                        Indicadores calculados a partir dos espelhos retornados pela API atual.
                        A base já está preparada para evoluir para cálculos oficiais no backend.
                    </p>
                </div>

                <div className="analytics-hero-actions">
                    <button
                        type="button"
                        className="btn btn-app-primary"
                        onClick={buscarAnalises}
                        disabled={carregandoAnalises}
                    >
                        {carregandoAnalises ? "Atualizando..." : "Atualizar análise"}
                    </button>

                    <button
                        type="button"
                        className="btn btn-soft"
                        onClick={exportarAnalisesCSV}
                        disabled={!analises?.colaboradores?.length || carregandoAnalises}
                    >
                        Exportar CSV
                    </button>
                </div>
            </div>

            <AnalyticsFilters
                equipe={equipe}
                filtrosAnalises={filtrosAnalises}
                setFiltrosAnalises={setFiltrosAnalises}
                carregandoAnalises={carregandoAnalises}
                buscarAnalises={buscarAnalises}
            />

            {analisesAtualizadasEm && (
                <p className="analytics-updated">
                    Última atualização: {analisesAtualizadasEm.toLocaleString("pt-BR")}
                </p>
            )}

            {carregandoAnalises && (
                <div className="app-card">
                    <div className="app-card-body">
                        <div className="empty-state">
                            <strong>Processando análises...</strong>
                            <p>Buscando os espelhos de ponto e consolidando indicadores por colaborador.</p>
                        </div>
                    </div>
                </div>
            )}

            {!carregandoAnalises && !analises && (
                <div className="app-card">
                    <div className="app-card-body">
                        <div className="empty-state">
                            <strong>Análise ainda não carregada</strong>
                            <p>Use o botão “Atualizar análise” para gerar os indicadores do período.</p>
                        </div>
                    </div>
                </div>
            )}

            {!carregandoAnalises && analises && (
                <React.Fragment>
                    <div className="kpi-grid">
                        <KpiCard
                            icon="👥"
                            label="Colaboradores"
                            value={resumo.totalColaboradores}
                            hint="No filtro atual"
                        />
                        <KpiCard
                            icon="⏱"
                            label="Horas trabalhadas"
                            value={formatarHoras(resumo.horasTrabalhadas)}
                            hint={`${formatarHoras(resumo.horasPrevistas)} previstas`}
                        />
                        <KpiCard
                            icon="⚖️"
                            label="Saldo geral"
                            value={formatarHoras(resumo.saldoHoras)}
                            hint={resumo.saldoHoras >= 0 ? "Acima ou dentro do previsto" : "Abaixo do previsto"}
                            tone={resumo.saldoHoras < 0 ? "warning" : "success"}
                        />
                        <KpiCard
                            icon="📉"
                            label="Absenteísmo"
                            value={formatarPercentual(resumo.absenteismoPercentual)}
                            hint={`${resumo.faltasEstimadas} falta(s) estimada(s)`}
                            tone={resumo.absenteismoPercentual > 0 ? "warning" : "success"}
                        />
                        <KpiCard
                            icon="🚨"
                            label="Ocorrências"
                            value={resumo.ocorrencias}
                            hint="Faltas, atrasos e pendências"
                            tone={resumo.ocorrencias > 0 ? "danger" : "success"}
                        />
                        <KpiCard
                            icon="🍽"
                            label="Intervalos"
                            value={`${resumo.iniciosAlmoco}/${resumo.voltasAlmoco}`}
                            hint={resumo.intervalosIncompletos > 0 ? `${resumo.intervalosIncompletos} incompleto(s)` : "Almoço e retorno"}
                            tone={resumo.intervalosIncompletos > 0 ? "warning" : "success"}
                        />
                        <KpiCard
                            icon="🛠"
                            label="Ajustes manuais"
                            value={resumo.ajustesManuais}
                            hint="Identificados no espelho"
                        />
                    </div>

                    <div className="analytics-section-grid">
                        <GestaoHorasTable colaboradores={analises.colaboradores} />
                        <AbsenteismoRanking ranking={analises.rankingAbsenteismo} />
                    </div>

                    <OcorrenciasPanel ocorrencias={analises.ocorrencias} />

                    <div className="app-card analytics-note">
                        <div className="app-card-body">
                            <strong>Nota técnica:</strong>
                            <p>
                                Faltas e absenteísmo são estimados usando dias úteis, carga diária e registros retornados pelo espelho atual.
                                Para valor jurídico/oficial, o ideal é o backend calcular com calendário, feriados, folgas, escalas e afastamentos.
                            </p>
                        </div>
                    </div>
                </React.Fragment>
            )}
        </section>
    );
}

function AnalyticsFilters({
    equipe,
    filtrosAnalises,
    setFiltrosAnalises,
    carregandoAnalises,
    buscarAnalises
}) {
    const atualizarFiltro = (campo, valor) => {
        setFiltrosAnalises({
            ...filtrosAnalises,
            [campo]: valor
        });
    };

    return (
        <div className="app-card filters-card">
            <div className="app-card-header">
                <h3 className="card-title">Filtros e regras do período</h3>
                <p className="card-description">Configure o recorte usado nos indicadores gerenciais.</p>
            </div>

            <div className="app-card-body">
                <div className="row g-3">
                    <div className="col-12 col-md-6 col-xl-2">
                        <label className="form-label" htmlFor="analise-inicio">Data inicial</label>
                        <input
                            id="analise-inicio"
                            type="date"
                            className="form-control"
                            value={filtrosAnalises.inicio}
                            onChange={(e) => atualizarFiltro("inicio", e.target.value)}
                        />
                    </div>

                    <div className="col-12 col-md-6 col-xl-2">
                        <label className="form-label" htmlFor="analise-fim">Data final</label>
                        <input
                            id="analise-fim"
                            type="date"
                            className="form-control"
                            value={filtrosAnalises.fim}
                            onChange={(e) => atualizarFiltro("fim", e.target.value)}
                        />
                    </div>

                    <div className="col-12 col-md-6 col-xl-3">
                        <label className="form-label" htmlFor="analise-funcionario">Colaborador</label>
                        <select
                            id="analise-funcionario"
                            className="form-select"
                            value={filtrosAnalises.funcionarioId}
                            onChange={(e) => atualizarFiltro("funcionarioId", e.target.value)}
                        >
                            <option value="todos">Todos</option>
                            {equipe.map((funcionario) => (
                                <option key={funcionario.id} value={funcionario.id}>
                                    {funcionario.nome_completo || funcionario.nome || `Funcionário ${funcionario.id}`}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="col-6 col-md-3 col-xl-1">
                        <label className="form-label" htmlFor="analise-carga">Carga</label>
                        <input
                            id="analise-carga"
                            type="number"
                            min="1"
                            max="24"
                            step="0.5"
                            className="form-control"
                            value={filtrosAnalises.cargaDiaria}
                            onChange={(e) => atualizarFiltro("cargaDiaria", e.target.value)}
                        />
                    </div>

                    <div className="col-6 col-md-3 col-xl-1">
                        <label className="form-label" htmlFor="analise-tolerancia">Tol.</label>
                        <input
                            id="analise-tolerancia"
                            type="number"
                            min="0"
                            max="120"
                            className="form-control"
                            value={filtrosAnalises.toleranciaMinutos}
                            onChange={(e) => atualizarFiltro("toleranciaMinutos", e.target.value)}
                        />
                    </div>

                    <div className="col-6 col-md-3 col-xl-1">
                        <label className="form-label" htmlFor="analise-entrada">Entrada</label>
                        <input
                            id="analise-entrada"
                            type="time"
                            className="form-control"
                            value={filtrosAnalises.entradaPrevista}
                            onChange={(e) => atualizarFiltro("entradaPrevista", e.target.value)}
                        />
                    </div>

                    <div className="col-6 col-md-3 col-xl-1">
                        <label className="form-label" htmlFor="analise-saida">Saída</label>
                        <input
                            id="analise-saida"
                            type="time"
                            className="form-control"
                            value={filtrosAnalises.saidaPrevista}
                            onChange={(e) => atualizarFiltro("saidaPrevista", e.target.value)}
                        />
                    </div>

                    <div className="col-12 col-xl-1 d-flex align-items-end">
                        <button
                            type="button"
                            className="btn btn-app-primary w-100"
                            onClick={buscarAnalises}
                            disabled={carregandoAnalises}
                        >
                            Aplicar
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

function KpiCard({ icon, label, value, hint, tone = "neutral" }) {
    return (
        <div className={`kpi-card ${tone}`}>
            <div className="kpi-icon">{icon}</div>
            <div>
                <p className="kpi-label">{label}</p>
                <strong className="kpi-value">{value}</strong>
                <span className="kpi-hint">{hint}</span>
            </div>
        </div>
    );
}

function GestaoHorasTable({ colaboradores }) {
    return (
        <div className="app-card">
            <div className="app-card-header">
                <h3 className="card-title">Gestão de horas</h3>
                <p className="card-description">Comparativo entre horas previstas, trabalhadas e saldo.</p>
            </div>

            <div className="app-card-body">
                <div className="history-table-wrapper d-none d-lg-block">
                    <table className="table history-table analytics-table">
                        <thead>
                            <tr>
                                <th>Colaborador</th>
                                <th>Previstas</th>
                                <th>Trabalhadas</th>
                                <th>Intervalo</th>
                                <th>Saldo</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {colaboradores.map((colaborador) => (
                                <tr key={colaborador.id}>
                                    <td>{colaborador.nome}</td>
                                    <td>{formatarHoras(colaborador.horasPrevistas)}</td>
                                    <td>{formatarHoras(colaborador.horasTrabalhadas)}</td>
                                    <td>{colaborador.iniciosAlmoco}/{colaborador.voltasAlmoco}</td>
                                    <td>
                                        <strong className={colaborador.saldoHoras < 0 ? "text-danger" : "text-success"}>
                                            {formatarHoras(colaborador.saldoHoras)}
                                        </strong>
                                    </td>
                                    <td><StatusPill status={colaborador.status} /></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="turnos-mobile d-lg-none">
                    {colaboradores.map((colaborador) => (
                        <div className="turno-card" key={`mobile-horas-${colaborador.id}`}>
                            <div className="turno-card-top">
                                <span className="turno-acao">{colaborador.nome}</span>
                                <StatusPill status={colaborador.status} />
                            </div>
                            <div><strong>Previstas:</strong> {formatarHoras(colaborador.horasPrevistas)}</div>
                            <div><strong>Trabalhadas:</strong> {formatarHoras(colaborador.horasTrabalhadas)}</div>
                            <div><strong>Intervalo:</strong> {colaborador.iniciosAlmoco}/{colaborador.voltasAlmoco}</div>
                            <div><strong>Saldo:</strong> {formatarHoras(colaborador.saldoHoras)}</div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

function AbsenteismoRanking({ ranking }) {
    const maiorOcorrencia = Math.max(1, ...ranking.map((item) => item.ocorrencias));

    return (
        <div className="app-card">
            <div className="app-card-header">
                <h3 className="card-title">Absenteísmo e ocorrências</h3>
                <p className="card-description">Ranking dos colaboradores que exigem atenção do RH.</p>
            </div>

            <div className="app-card-body">
                {ranking.length === 0 && (
                    <div className="empty-state">
                        <strong>Nenhum dado para ranking</strong>
                        <p>Atualize a análise para gerar os indicadores.</p>
                    </div>
                )}

                {ranking.length > 0 && (
                    <div className="ranking-list">
                        {ranking.map((item) => (
                            <div className="ranking-item" key={`ranking-${item.id}`}>
                                <div className="ranking-top">
                                    <strong>{item.nome}</strong>
                                    <span>{formatarPercentual(item.absenteismoPercentual)}</span>
                                </div>

                                <div className="progress-bar-soft">
                                    <span style={{ width: `${Math.min(100, (item.ocorrencias / maiorOcorrencia) * 100)}%` }}></span>
                                </div>

                                <p>
                                    {item.faltasEstimadas} falta(s), {item.atrasos} atraso(s), {item.saidasAntecipadas} saída(s) antecipada(s), {item.intervalosIncompletos} intervalo(s) incompleto(s)
                                </p>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

function OcorrenciasPanel({ ocorrencias }) {
    return (
        <div className="app-card">
            <div className="app-card-header">
                <h3 className="card-title">Ocorrências para revisão</h3>
                <p className="card-description">Fila gerencial para conferência do RH.</p>
            </div>

            <div className="app-card-body">
                {ocorrencias.length === 0 && (
                    <div className="empty-state">
                        <strong>Nenhuma ocorrência crítica encontrada</strong>
                        <p>Os dados carregados não indicaram pendências relevantes no período.</p>
                    </div>
                )}

                {ocorrencias.length > 0 && (
                    <div className="occurrence-list">
                        {ocorrencias.map((ocorrencia, index) => (
                            <div className={`occurrence-item ${ocorrencia.severidade}`} key={`${ocorrencia.funcionario}-${ocorrencia.tipo}-${index}`}>
                                <div>
                                    <strong>{ocorrencia.tipo}</strong>
                                    <p>{ocorrencia.funcionario}</p>
                                </div>
                                <span>{ocorrencia.descricao}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

function StatusPill({ status }) {
    return (
        <span className={`status-pill ${normalizarTexto(status)}`}>
            {status}
        </span>
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
                                            <td>{formatarAcaoTurno(t)}</td>
                                            <td>{obterHorarioTurno(t)}</td>
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
                                        <span className="turno-acao">{formatarAcaoTurno(t)}</span>
                                        <span className="turno-horario">{obterHorarioTurno(t)}</span>
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
