(() => {
  const root = new URL("../", document.currentScript.src);
  const asset = (src) => new URL(src, root).href;
  const node = (tag, className, text) => {
    const el = document.createElement(tag);
    el.className = className || "";
    if (text !== undefined) el.textContent = text;
    return el;
  };
  window.ChessMent = { root, asset, node };
  window.chessmentReady = (async () => {
    let data;
    try {
      const response = await fetch(new URL("api/content", root));
      if (!response.ok) throw new Error("Servidor indisponível");
      data = (await response.json()).data;
    } catch {
      try {
        const response = await fetch(new URL("public/content.json", root));
        data = await response.json();
      } catch {
        return null;
      }
    }
    if (document.body.dataset.page === "admin") return data;
    const fields = data.pages[document.body.dataset.page] || {};
    document.querySelectorAll("[data-content]").forEach((el) => {
      const field = fields[el.dataset.content];
      if (!field) return;
      if (field.kind === "image") {
        el.hidden = !field.value;
        if (field.value) el.src = asset(field.value);
        else el.removeAttribute("src");
      } else if (field.kind === "video") {
        el.src = field.value;
        const link = document.querySelector(".watch-link");
        if (link)
          link.href = `https://www.youtube.com/watch?v=${field.value.split("/").pop()}`;
      } else el.textContent = field.value;
    });
    const contacts = data.pages.contactos;
    const originals = {
      email: "chessment@gmail.com",
      phone: "+258 85 500 2715",
      address: "Maputo, Moçambique",
    };
    document
      .querySelectorAll(".footer-section p, .contact-card li")
      .forEach((el) => {
        Object.entries(originals).forEach(([key, value]) => {
          if (!el.textContent.includes(value)) return;
          const icon = el.querySelector("i")?.cloneNode(true);
          const text = contacts[key].value;
          el.replaceChildren();
          if (icon) el.append(icon, " ");
          if (key === "address") el.append(text);
          else {
            const a = node("a", "", text);
            a.href =
              key === "email"
                ? `mailto:${text}`
                : `tel:${text.replace(/[^+\d]/g, "")}`;
            el.append(a);
          }
        });
      });
    document.querySelectorAll("a[href]").forEach((a) => {
      const href = a.getAttribute("href");
      const key = href.includes("wa.me/")
        ? "whatsapp"
        : href.includes("instagram.com/")
          ? "instagram"
          : href.includes("facebook.com/")
            ? "facebook"
            : href.includes("youtube.com/") &&
                !a.classList.contains("watch-link")
              ? "youtube"
              : null;
      if (key) a.href = contacts[key].value;
    });
    const grid = document.querySelector(".tournament-grid");
    if (grid) {
      grid.replaceChildren();
      const tournaments = data.tournaments.filter((t) => t.status !== "draft");
      tournaments.forEach((t) => {
        const card = node("article", "tournament-card");
        card.dataset.tournament = t.name;
        card.dataset.registrationKey = t.registrationKey;
        card.dataset.registrationId = t.id;
        if (t.image) {
          const img = node("img", "tournament-image");
          img.src = asset(t.image);
          img.alt = t.name;
          img.loading = "lazy";
          card.append(img);
        }
        card.append(
          node("span", "card-tag", t.category),
          node("h2", "", t.name),
          node("p", "", t.description),
        );
        const meta = node("div", "card-meta");
        const date = t.date
          ? new Intl.DateTimeFormat("pt-MZ", {
              day: "numeric",
              month: "long",
              year: "numeric",
            }).format(new Date(`${t.date}T12:00:00`))
          : "Data a anunciar";
        meta.append(node("span", "", date + (t.time ? ` · ${t.time}` : "")));
        const location = node("span", "tournament-location");
        location.append(
          node("i", "fa-solid fa-location-dot"),
          document.createTextNode(t.location),
        );
        const mapLink = node("button", "map-link");
        mapLink.type = "button";
        mapLink.dataset.mapButton = "";
        mapLink.dataset.mapLocation = t.location;
        mapLink.dataset.mapUrl = t.mapUrl || "";
        mapLink.setAttribute(
          "aria-label",
          `Ver localização de ${t.name} no mapa`,
        );
        mapLink.title = "Ver localização no mapa";
        mapLink.append(node("i", "fa-solid fa-eye", ""));
        location.append(mapLink);
        meta.append(location);
        if (t.fee) meta.append(node("span", "", t.fee));
        const count = node("span", "", "0 inscritos");
        count.dataset.registrationCount = "";
        meta.append(count);
        const actions = node("div", "card-actions");
        const register = node(
          "button",
          "card-button",
          t.status === "closed" ? "Inscrições encerradas" : "Inscrever-se",
        );
        register.type = "button";
        register.disabled = t.status === "closed";
        register.dataset.registrationAction = "";
        const list = node("button", "list-button", "Ver inscritos");
        list.type = "button";
        actions.append(register, list);
        card.append(meta, actions);
        grid.append(card);
      });
      const mapModal = document.querySelector("#mapModal");
      const mapFrame = document.querySelector("#mapFrame");
      const mapTitle = document.querySelector("#mapTitle");
      let lastMapTrigger;
      const closeMap = () => {
        mapModal.classList.remove("open");
        mapModal.setAttribute("aria-hidden", "true");
        mapFrame.removeAttribute("src");
        document.body.style.overflow = "";
        lastMapTrigger?.focus();
      };
      grid.addEventListener("click", (event) => {
        const trigger = event.target.closest("[data-map-button]");
        if (!trigger || !mapModal || !mapFrame || !mapTitle) return;
        lastMapTrigger = trigger;
        mapTitle.textContent = `Localização — ${trigger.closest(".tournament-card").dataset.tournament}`;
        mapFrame.src =
          trigger.dataset.mapUrl ||
          `https://www.google.com/maps?q=${encodeURIComponent(trigger.dataset.mapLocation)}&output=embed`;
        mapModal.classList.add("open");
        mapModal.setAttribute("aria-hidden", "false");
        document.body.style.overflow = "hidden";
        mapModal.querySelector(".map-close")?.focus();
      });
      mapModal
        ?.querySelector(".map-close")
        ?.addEventListener("click", closeMap);
      mapModal?.addEventListener("click", (event) => {
        if (event.target === mapModal) closeMap();
      });
      document.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && mapModal?.classList.contains("open"))
          closeMap();
      });
      if (!tournaments.length)
        grid.append(
          node(
            "p",
            "empty-content",
            "Em breve teremos novos torneios. Acompanhe as novidades!",
          ),
        );
    }
    return data;
  })();
})();
