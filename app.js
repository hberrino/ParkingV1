const API_URL = "https://691b54b92d8d7855757278a4.mockapi.io/vehiculos";

const grid = document.getElementById("gridEstacionamiento");
const infoRetiro = document.getElementById("infoRetiro");

const btnTema = document.getElementById("btnTema");
const btnConfig = document.getElementById("btnConfig");
const modalConfig = document.getElementById("modalConfig");
const cfgEspacios = document.getElementById("cfgEspacios");
const cfgMoto = document.getElementById("cfgMoto");
const cfgAuto = document.getElementById("cfgAuto");
const guardarConfig = document.getElementById("guardarConfig");
const cerrarConfig = document.getElementById("cerrarConfig");


const modalRegistro = document.getElementById("modalRegistro");
const regTipo = document.getElementById("regTipo");
const regPatente = document.getElementById("regPatente");
const btnRegistrarConfirmar = document.getElementById("btnRegistrarConfirmar");
const btnRegistrarCancelar = document.getElementById("btnRegistrarCancelar");

let espacioSeleccionado = null;

let config = {
    espacios: parseInt(localStorage.getItem("espacios")) || 20,
    precioMoto: parseInt(localStorage.getItem("precioMoto")) || 300,
    precioAuto: parseInt(localStorage.getItem("precioAuto")) || 500
};

cfgEspacios.value = config.espacios;
cfgMoto.value = config.precioMoto;
cfgAuto.value = config.precioAuto;


class Vehiculo {
    constructor(tipo, patente) {
        this.tipo = tipo;
        this.patente = patente;

        this.fechaIngreso = new Date().toISOString();
    }
}

class Estacionamiento {
    constructor(capacidad) {
        this.capacidad = capacidad;
        this.espacios = [];

        for (let i = 1; i <= capacidad; i++) {
            this.espacios.push({
                id: i,
                libre: true,
                vehiculo: null
            });
        }
    }

    registrar(idEspacio, tipo, patente) {
        let esp = this.espacios.find(e => e.id === idEspacio);
        if (esp && esp.libre) {
            esp.vehiculo = new Vehiculo(tipo, patente);
            esp.libre = false;
            return true;
        }
        return false;
    }

    retirar(idEspacio) {
        let esp = this.espacios.find(e => e.id === idEspacio);
        if (esp && !esp.libre) {
            esp.vehiculo = null;
            esp.libre = true;
            return true;
        }
        return false;
    }
}

let est = new Estacionamiento(config.espacios);
cargarDesdeAPI();

async function cargarDesdeAPI() {
    try {
        const res = await fetch(API_URL);
        const data = await res.json();

        est = new Estacionamiento(config.espacios);

        data.forEach(v => {
            if (v.espacioId <= config.espacios) {
                const esp = est.espacios[v.espacioId - 1];
                esp.libre = false;
                esp.vehiculo = {
                    tipo: v.tipo,
                    patente: v.patente,
                    fechaIngreso: v.fechaIngreso  // ISO guardado
                };
            }
        });

        generarEspacios();

    } catch (e) {
        console.error("Error API:", e);
    }
}

function generarEspacios() {
    grid.innerHTML = "";

    est.espacios.forEach(esp => {
        const div = document.createElement("div");
        div.classList.add("espacio");

        if (esp.libre) {
            div.classList.add("espacio-libre");
            div.textContent = "LIBRE";
        } else {
            div.classList.add("espacio-ocupado");
            div.textContent = esp.vehiculo.patente;
        }

        div.addEventListener("click", () => {
            if (esp.libre) abrirModalRegistro(esp);
            else mostrarPanelRetiro(esp);
        });

        grid.appendChild(div);
    });
}

function abrirModalRegistro(esp) {
    espacioSeleccionado = esp;
    regPatente.value = "";
    regTipo.value = "Auto";
    modalRegistro.classList.remove("oculto");
}

btnRegistrarCancelar.addEventListener("click", () => {
    modalRegistro.classList.add("oculto");
});

btnRegistrarConfirmar.addEventListener("click", async () => {
    const tipo = regTipo.value;
    const patente = regPatente.value.trim().toUpperCase();

    if (patente.length < 5) {
        alert("Patente inválida");
        return;
    }

    const fechaISO = new Date().toISOString();

    await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            tipo,
            patente,
            espacioId: espacioSeleccionado.id,
            fechaIngreso: fechaISO
        })
    });

    modalRegistro.classList.add("oculto");
    cargarDesdeAPI();
});

function mostrarPanelRetiro(espacio) {
    if (espacio.libre) {
        infoRetiro.innerHTML = "Seleccione un vehículo ocupado para ver los detalles.";
        return;
    }

    const fechaIngreso = new Date(espacio.vehiculo.fechaIngreso); // ISO → Date
    const ahora = new Date();

    const ms = ahora - fechaIngreso;
    const horas = Math.floor(ms / 3600000);
    const minutos = Math.floor((ms % 3600000) / 60000);

    const tarifa = espacio.vehiculo.tipo === "Moto"
        ? config.precioMoto
        : config.precioAuto;

    const horasCobrar = Math.ceil(ms / 3600000);
    const total = horasCobrar * tarifa;

    infoRetiro.innerHTML = 
`Patente: ${espacio.vehiculo.patente}
Tipo: ${espacio.vehiculo.tipo}
Ingreso: ${fechaIngreso.toLocaleString()}

Tiempo: ${horas}h ${minutos}m
Tarifa por hora: $${tarifa}
-----------------------------------
TOTAL A COBRAR: $${total}
`;

    infoRetiro.innerHTML += `<button id="btnConfirmarRetiro">Confirmar Retiro</button>`;

    document.getElementById("btnConfirmarRetiro")
        .addEventListener("click", () => confirmarRetiro(espacio));
}

async function confirmarRetiro(espacio) {

    const patente = espacio.vehiculo.patente;

    const res = await fetch(`${API_URL}?patente=${patente}`);
    const data = await res.json();

    if (data.length > 0) {
        await fetch(`${API_URL}/${data[0].id}`, { method: "DELETE" });
    }

    est.retirar(espacio.id);
    cargarDesdeAPI();

    infoRetiro.innerHTML = "Vehículo retirado con éxito.";
}

btnConfig.addEventListener("click", () => {
    modalConfig.classList.remove("oculto");
});

cerrarConfig.addEventListener("click", () => {
    modalConfig.classList.add("oculto");
});

guardarConfig.addEventListener("click", () => {
    config.espacios = parseInt(cfgEspacios.value);
    config.precioMoto = parseInt(cfgMoto.value);
    config.precioAuto = parseInt(cfgAuto.value);

    localStorage.setItem("espacios", config.espacios);
    localStorage.setItem("precioMoto", config.precioMoto);
    localStorage.setItem("precioAuto", config.precioAuto);

    modalConfig.classList.add("oculto");

    cargarDesdeAPI();
});

btnTema.addEventListener("click", () => {
    document.body.classList.toggle("claro");

    btnTema.textContent =
        document.body.classList.contains("claro") ? "☀️" : "🌙";

    localStorage.setItem(
        "tema",
        document.body.classList.contains("claro") ? "claro" : "oscuro"
    );
});

if (localStorage.getItem("tema") === "claro") {
    document.body.classList.add("claro");
    btnTema.textContent = "☀️";
}
