const horarios = gerarHorarios();
let slotSelecionado = null;
let slotsSelecionados = []; // multi-seleção

function gerarHorarios() {
    let lista = [];
    for (let i = 450; i <= 1020; i += 30) {
        let h = Math.floor(i / 60).toString().padStart(2, '0');
        let m = (i % 60).toString().padStart(2, '0');
        lista.push(`${h}:${m}`);
    }
    return lista;
}

function hojeISO() {
    return new Date().toISOString().split("T")[0];
}

// API
async function carregarDia(data) {
    let res = await fetch(`/agenda/${data}`);
    return await res.json();
}

async function salvarDia(data, dados) {
    await fetch(`/agenda/${data}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dados)
    });
}

// ===========================
// SELEÇÃO MÚLTIPLA
// ===========================

function toggleSlotSelecionado(hora) {
    const idx = slotsSelecionados.indexOf(hora);
    if (idx === -1) {
        slotsSelecionados.push(hora);
    } else {
        slotsSelecionados.splice(idx, 1);
    }
    atualizarSlotsVisuais();
    atualizarBotaoFlutuante();
}

function atualizarSlotsVisuais() {
    document.querySelectorAll(".livre-slot").forEach(el => {
        const hora = el.dataset.hora;
        if (slotsSelecionados.includes(hora)) {
            el.classList.add("selecionado");
            el.querySelector(".slot-hint").textContent = "✓ Selecionado";
        } else {
            el.classList.remove("selecionado");
            el.querySelector(".slot-hint").textContent = "Clique para reservar";
        }
    });
}

function atualizarBotaoFlutuante() {
    const btn = document.getElementById("btn-flutuante");
    if (slotsSelecionados.length > 0) {
        btn.style.display = "flex";
        btn.querySelector(".btn-flutuante-count").textContent =
            slotsSelecionados.length === 1
                ? "1 horário selecionado"
                : `${slotsSelecionados.length} horários selecionados`;
    } else {
        btn.style.display = "none";
    }
}

function limparSelecao() {
    slotsSelecionados = [];
    atualizarSlotsVisuais();
    atualizarBotaoFlutuante();
}

// ===========================
// MODAIS
// ===========================

function abrirModalReservaMultipla() {
    const lista = document.getElementById("lista-horas-reserva");
    lista.innerHTML = slotsSelecionados
        .slice()
        .sort()
        .map(h => `<span class="tag-hora">${h}</span>`)
        .join("");
    document.getElementById("input-nome").value = "";
    document.getElementById("input-senha").value = "";
    document.getElementById("erro-reserva").textContent = "";
    document.getElementById("modal-reserva").classList.add("ativo");
}

function abrirModalReserva(hora) {
    // compatibilidade com seleção simples (hora única)
    slotsSelecionados = [hora];
    atualizarBotaoFlutuante();
    abrirModalReservaMultipla();
}

function fecharModalReserva() {
    document.getElementById("modal-reserva").classList.remove("ativo");
    slotSelecionado = null;
}

function abrirModalCancelar(hora, nomeAtual) {
    slotSelecionado = hora;
    document.getElementById("modal-hora-cancelar").textContent = hora;
    document.getElementById("modal-nome-cancelar").textContent = nomeAtual;
    document.getElementById("input-senha-cancelar").value = "";
    document.getElementById("erro-cancelar").textContent = "";
    document.getElementById("modal-cancelar").classList.add("ativo");
}

function fecharModalCancelar() {
    document.getElementById("modal-cancelar").classList.remove("ativo");
    slotSelecionado = null;
}

// Fechar modal ao clicar fora
document.addEventListener("click", (e) => {
    if (e.target.classList.contains("modal-overlay")) {
        fecharModalReserva();
        fecharModalCancelar();
    }
});

// ===========================
// CONFIRMAR RESERVA (múltipla)
// ===========================

async function confirmarReserva() {
    const nome = document.getElementById("input-nome").value.trim();
    const senha = document.getElementById("input-senha").value.trim();
    const erro = document.getElementById("erro-reserva");

    if (!nome) {
        erro.textContent = "⚠️ Por favor, informe seu nome.";
        return;
    }
    if (senha.length < 3) {
        erro.textContent = "⚠️ A senha precisa ter pelo menos 3 caracteres.";
        return;
    }

    const data = document.getElementById("data").value;
    const dados = await carregarDia(data);

    // Verificar se algum slot foi tomado enquanto selecionava
    const conflitos = slotsSelecionados.filter(h => dados[h]);
    if (conflitos.length > 0) {
        erro.textContent = `⚠️ ${conflitos.join(", ")} já ${conflitos.length > 1 ? "foram reservados" : "foi reservado"} por outra pessoa.`;
        return;
    }

    // Salvar todos os slots de uma vez
    for (const h of slotsSelecionados) {
        dados[h] = { nome, codigo: senha };
    }
    await salvarDia(data, dados);

    slotsSelecionados = [];
    fecharModalReserva();
    atualizarBotaoFlutuante();
    render();
}

// ===========================
// CONFIRMAR CANCELAMENTO
// ===========================

async function confirmarCancelar() {
    const senha = document.getElementById("input-senha-cancelar").value.trim();
    const erro = document.getElementById("erro-cancelar");
    const data = document.getElementById("data").value;
    const dados = await carregarDia(data);
    const hora = slotSelecionado;

    if (!dados[hora]) {
        erro.textContent = "⚠️ Este horário já está livre.";
        return;
    }

    if (dados[hora].codigo !== senha) {
        erro.textContent = "❌ Senha incorreta. Tente novamente.";
        return;
    }

    delete dados[hora];
    await salvarDia(data, dados);
    fecharModalCancelar();
    render();
}

// Permitir Enter nos inputs
document.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
        if (document.getElementById("modal-reserva").classList.contains("ativo")) {
            confirmarReserva();
        } else if (document.getElementById("modal-cancelar").classList.contains("ativo")) {
            confirmarCancelar();
        }
    }
    if (e.key === "Escape") {
        fecharModalReserva();
        fecharModalCancelar();
        limparSelecao();
    }
});

// ===========================
// RENDER
// ===========================

async function render() {
    let data = document.getElementById("data").value;
    if (!data) return;

    let agenda = document.getElementById("agenda");
    let dados = await carregarDia(data);

    agenda.innerHTML = "";

    let agora = new Date();
    let hoje = hojeISO();

    for (let h of horarios) {
        let div = document.createElement("div");
        let bloqueado = false;

        if (data === hoje) {
            let [hh, mm] = h.split(":");
            let dt = new Date();
            dt.setHours(hh, mm, 0);
            if (dt < agora) bloqueado = true;
        }

        if (bloqueado) {
            div.className = "slot bloqueado";
            div.innerText = h;
        } else if (dados[h]) {
            div.className = "slot ocupado-slot";
            div.innerHTML = `
                <span class="slot-hora">${h}</span>
                <span class="slot-nome">${dados[h].nome}</span>
                <span class="slot-hint">Clique para cancelar</span>
            `;
            div.onclick = () => abrirModalCancelar(h, dados[h].nome);
        } else {
            div.className = "slot livre-slot";
            div.dataset.hora = h;
            const selecionado = slotsSelecionados.includes(h);
            div.innerHTML = `
                <span class="slot-hora">${h}</span>
                <span class="slot-hint">${selecionado ? "✓ Selecionado" : "Clique para reservar"}</span>
            `;
            if (selecionado) div.classList.add("selecionado");
            div.onclick = () => toggleSlotSelecionado(h);
        }

        agenda.appendChild(div);
    }

    atualizarStatus(dados, data);
}

// ===========================
// STATUS AGORA
// ===========================

function atualizarStatus(dados, data) {
    let status = document.getElementById("statusAgora");
    let agora = new Date();

    let slotAtivo = null;
    for (let h of horarios) {
        let [hh, mm] = h.split(":").map(Number);
        let inicio = hh * 60 + mm;
        let fim = inicio + 30;
        let agoraMin = agora.getHours() * 60 + agora.getMinutes();
        if (agoraMin >= inicio && agoraMin < fim) {
            slotAtivo = h;
            break;
        }
    }

    if (slotAtivo && dados[slotAtivo] && data === hojeISO()) {
        status.innerHTML = `<span class="status-icon">🔴</span> OCUPADO AGORA — <strong>${dados[slotAtivo].nome}</strong>`;
        status.className = "status-card ocupado";
    } else if (data === hojeISO()) {
        status.innerHTML = `<span class="status-icon">🟢</span> SALA LIVRE AGORA`;
        status.className = "status-card livre";
    } else {
        status.innerHTML = `<span class="status-icon">📅</span> Visualizando outro dia`;
        status.className = "status-card neutro";
    }
}

// ===========================
// BOTÃO HOJE
// ===========================

function irHoje() {
    document.getElementById("data").value = hojeISO();
    limparSelecao();
    render();
}

// EVENTO DATA
document.getElementById("data").addEventListener("change", () => {
    limparSelecao();
    render();
});

// INIT
window.onload = () => {
    document.getElementById("data").value = hojeISO();
    render();
};

// AUTO UPDATE a cada 5s (sem resetar seleção)
setInterval(async () => {
    const data = document.getElementById("data").value;
    if (!data) return;
    const dados = await carregarDia(data);
    atualizarStatus(dados, data);

    // Re-renderizar apenas se não houver seleção ativa (evita conflito com cliques)
    if (slotsSelecionados.length === 0) {
        render();
    }
}, 5000);
