(function () {
  "use strict";

  var C = window.LEVA_EU || {};
  var params = new URLSearchParams(location.search);
  document.documentElement.classList.add("js");

  /* ---------- Teste A/B/C de posicionamento (CP2) ---------- */
  var TEXTOS = {
    A: "Você bebeu. Não dirija. E não deixe seu carro para trás.",
    B: "Duas corridas e uma diária de estacionamento. Ou R$ 69.",
    C: "Um botão. Você em casa. Seu carro também."
  };
  var variante = (params.get("v") || "").toUpperCase();
  try { if (!TEXTOS[variante]) variante = localStorage.getItem("leva_v"); } catch (e) {}
  if (!TEXTOS[variante]) variante = ["A", "B", "C"][Math.floor(Math.random() * 3)];
  try { localStorage.setItem("leva_v", variante); } catch (e) {}
  document.getElementById("headline").textContent = TEXTOS[variante];

  var origem = [params.get("utm_source"), params.get("utm_medium"), params.get("utm_campaign")]
    .filter(Boolean).join("/") || "direto";

  /* ---------- Analytics (opcional) ---------- */
  if (C.ga4) {
    var tag = document.createElement("script");
    tag.async = true;
    tag.src = "https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(C.ga4);
    document.head.appendChild(tag);
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag("js", new Date());
    window.gtag("config", C.ga4);
  }
  function evento(nome) {
    if (window.gtag) window.gtag("event", nome, { variante: variante, origem: origem });
  }
  document.querySelectorAll("[data-evento]").forEach(function (el) {
    el.addEventListener("click", function () { evento(el.getAttribute("data-evento")); });
  });

  /* ---------- Animação de entrada ---------- */
  var reveals = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add("is-visible"); io.unobserve(en.target); }
      });
    }, { threshold: 0.12 });
    reveals.forEach(function (el) { io.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add("is-visible"); });
  }

  /* ---------- WhatsApp ---------- */
  function zapLink(texto) {
    return "https://wa.me/" + (C.whatsapp || "") + "?text=" + encodeURIComponent(texto);
  }
  var zap = document.getElementById("zap");
  zap.href = C.whatsapp ? zapLink("Oi! Vi o Leva Eu e quero saber mais. (variante " + variante + ")") : "#lista";
  if (!C.whatsapp) zap.hidden = true;

  /* ---------- Toast e status ---------- */
  var toastEl = document.getElementById("toast"), toastTimer;
  function toast(msg) {
    toastEl.textContent = msg; toastEl.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.hidden = true; }, 4000);
  }
  var statusEl = document.getElementById("status");
  function setStatus(msg, tipo) {
    statusEl.hidden = !msg;
    statusEl.textContent = msg || "";
    statusEl.className = "status" + (tipo ? " is-" + tipo : "");
  }

  /* ---------- Formulário ---------- */
  var form = document.getElementById("form");
  var phoneInput = form.elements.whatsapp;

  // Máscara (11) 90000-0000
  phoneInput.addEventListener("input", function () {
    var d = phoneInput.value.replace(/\D/g, "").slice(0, 11), out = d;
    if (d.length > 6) out = "(" + d.slice(0, 2) + ") " + d.slice(2, d.length - 4) + "-" + d.slice(-4);
    else if (d.length > 2) out = "(" + d.slice(0, 2) + ") " + d.slice(2);
    phoneInput.value = out;
  });

  var REGRAS = {
    nome: function (v) { return v.trim().length >= 2 ? "" : "Digite o seu nome."; },
    whatsapp: function (v) { var n = v.replace(/\D/g, ""); return n.length >= 10 && n.length <= 11 ? "" : "Digite um WhatsApp com DDD."; },
    bairro: function (v) { return v.trim() ? "" : "Informe o bairro."; },
    carro: function (v) { return v.trim() ? "" : "Informe o modelo do carro."; }
  };
  function erro(nome, msg) {
    var small = form.querySelector('.error[data-for="' + nome + '"]');
    if (small) small.textContent = msg;
    var campo = form.elements[nome];
    if (campo && campo.type !== "checkbox") campo.setAttribute("aria-invalid", msg ? "true" : "false");
  }
  Object.keys(REGRAS).forEach(function (nome) {
    form.elements[nome].addEventListener("blur", function () { erro(nome, REGRAS[nome](form.elements[nome].value)); });
    form.elements[nome].addEventListener("input", function () { if (form.elements[nome].getAttribute("aria-invalid") === "true") erro(nome, REGRAS[nome](form.elements[nome].value)); });
  });

  function validar() {
    var primeiro = null;
    Object.keys(REGRAS).forEach(function (nome) {
      var m = REGRAS[nome](form.elements[nome].value);
      erro(nome, m);
      if (m && !primeiro) primeiro = form.elements[nome];
    });
    var okLgpd = form.elements.lgpd.checked;
    erro("lgpd", okLgpd ? "" : "Aceite o uso dos dados para continuar.");
    if (!okLgpd && !primeiro) primeiro = form.elements.lgpd;
    if (primeiro) primeiro.focus();
    return !primeiro;
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    setStatus("");
    if (!validar()) return;

    var f = form.elements;
    var dados = { nome: f.nome.value.trim(), whatsapp: f.whatsapp.value.trim(), bairro: f.bairro.value.trim(), carro: f.carro.value.trim() };
    var botao = form.querySelector('button[type="submit"]');

    if (C.formAction) {
      var corpo = new URLSearchParams(), E = C.entries || {};
      Object.keys(dados).forEach(function (k) { if (E[k]) corpo.append(E[k], dados[k]); });
      if (E.variante) corpo.append(E.variante, variante);
      if (E.origem) corpo.append(E.origem, origem);

      botao.disabled = true; botao.textContent = "Enviando…";
      fetch(C.formAction, { method: "POST", mode: "no-cors", body: corpo })
        .then(function () {
          evento("cadastro_lista");
          form.reset();
          setStatus("Pronto, você está na lista. Entraremos em contato pelo WhatsApp.", "ok");
          toast("Cadastro enviado");
        })
        .catch(function () { setStatus("Não deu para enviar agora. Tente de novo em instantes.", "error"); })
        .then(function () { botao.disabled = false; botao.textContent = "Quero entrar na lista"; });
      return;
    }

    if (C.whatsapp) {
      evento("cadastro_lista");
      window.location.href = zapLink(
        "Quero entrar na lista do Leva Eu.\nNome: " + dados.nome + "\nWhatsApp: " + dados.whatsapp +
        "\nBairro: " + dados.bairro + "\nCarro: " + dados.carro +
        "\n(variante " + variante + ", origem " + origem + ")");
      return;
    }

    setStatus("O cadastro ainda não está disponível. Volte em breve.", "error");
  });
})();
