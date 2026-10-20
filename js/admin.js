(() => {
  const { root, asset, node } = window.ChessMent;
  const $ = (selector) => document.querySelector(selector);
  const names = {
    open: "Inscrições abertas",
    draft: "Rascunho",
    closed: "Encerrado",
  };
  let data,
    revision,
    csrf = "",
    editing,
    dirty = false,
    pageDirty = false,
    busy = false;
  const message = (text, error = false, inside = false) => {
    const el = $(inside ? "#editor-status" : "#status");
    el.textContent = text;
    el.classList.toggle("error", error);
  };
  async function api(path, body) {
    const headers = new Headers({ Accept: "application/json" });
    if (body !== undefined) {
      headers.set("Content-Type", "application/json");
      headers.set("X-CSRF-Token", csrf);
    }
    const url = new URL(`api/${path}`, root);
    let response;
    try {
      response = await fetch(
        url,
        body === undefined
          ? { headers }
          : {
              method: "POST",
              headers,
              body: JSON.stringify(body),
            },
      );
    } catch {
      throw new Error(
        "Não foi possível contactar o Laravel. Confirme que php artisan serve está em execução e abra http://localhost:8000/html/admin.html.",
      );
    }
    let result;
    try {
      result = await response.json();
    } catch {
      throw new Error(
        `O endereço ${url.origin} respondeu com conteúdo não JSON (HTTP ${response.status}). Para guardar, abra http://localhost:8000/html/admin.html em vez do Five Server.`,
      );
    }
    if (!response.ok) {
      if (response.status === 401 && path !== "login") {
        $("#editor").close();
        $("#login-panel").hidden = false;
        $("#dashboard").hidden = true;
        $("#password").focus();
      }
      throw new Error(
        result.error ||
          result.message ||
          "Não foi possível concluir a operação.",
      );
    }
    return result;
  }
  function unsaved() {
    return dirty || pageDirty;
  }
  window.addEventListener("beforeunload", (event) => {
    if (unsaved() || busy) {
      event.preventDefault();
      event.returnValue = "";
    }
  });
  function indicator() {
    $("#save-indicator").textContent = unsaved()
      ? "Alterações por guardar"
      : "Conteúdos actualizados";
  }
  async function save(next) {
    if (busy) throw new Error("Aguarde a operação em curso.");
    busy = true;
    const buttons = [...document.querySelectorAll("button")];
    buttons.forEach((b) => (b.disabled = true));
    try {
      const result = await api("content", { data: next, revision });
      data = next;
      revision = result.revision;
      render();
      message("Alterações guardadas. O site já está actualizado.");
    } finally {
      busy = false;
      buttons.forEach((b) => (b.disabled = false));
    }
  }
  function labelField(
    container,
    key,
    label,
    value = "",
    type = "text",
    required = false,
    full = false,
  ) {
    const wrapper = node("label", full ? "full-width" : "", label);
    const input = node(type === "textarea" ? "textarea" : "input");
    if (type !== "textarea") input.type = type;
    input.name = key;
    input.value = value;
    input.required = required;
    if (["text", "textarea", "url"].includes(type))
      input.maxLength = type === "textarea" ? 5000 : 500;
    wrapper.append(input);
    container.append(wrapper);
    return input;
  }
  function imageField(container, key, value, required = false) {
    const wrapper = node("div", "full-width");
    const label = node("label", "", "Imagem");
    const file = node("input");
    file.type = "file";
    file.accept = "image/jpeg,image/png,image/webp";
    const hidden = node("input");
    hidden.type = "hidden";
    hidden.name = key;
    hidden.value = value;
    const preview = node("img", "preview-image");
    preview.alt = "Pré-visualização da imagem";
    const update = () => {
      preview.hidden = !hidden.value;
      if (hidden.value) preview.src = asset(hidden.value);
      else preview.removeAttribute("src");
    };
    update();
    const remove = node("button", "button button-light", "Remover imagem");
    remove.type = "button";
    remove.addEventListener("click", () => {
      hidden.value = "";
      file.value = "";
      update();
      hidden.dispatchEvent(new Event("input", { bubbles: true }));
    });
    const note = node(
      "small",
      "",
      "JPG, PNG ou WebP, até 10 MB. A imagem será ajustada automaticamente." +
        (required ? " Obrigatória." : " Opcional."),
    );
    const error = node("small");
    error.setAttribute("role", "status");
    file.addEventListener("change", async () => {
      const selected = file.files[0];
      if (!selected) return;
      error.textContent = "A preparar imagem…";
      const submit = container.closest("form").querySelector("[type=submit]");
      submit.disabled = true;
      try {
        if (
          !["image/jpeg", "image/png", "image/webp"].includes(selected.type) ||
          selected.size > 10_000_000
        )
          throw new Error("Escolha uma imagem JPG, PNG ou WebP até 10 MB.");
        const bitmap = await createImageBitmap(selected);
        const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(bitmap.width * scale));
        canvas.height = Math.max(1, Math.round(bitmap.height * scale));
        const ctx = canvas.getContext("2d");
        ctx.fillStyle = "#fff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
        bitmap.close();
        const result = canvas.toDataURL("image/jpeg", 0.84);
        if (result.length > 2_600_000)
          throw new Error(
            "A imagem continua demasiado grande. Escolha uma imagem menor.",
          );
        hidden.value = result;
        update();
        error.textContent =
          "Imagem pronta. Guarde as alterações para publicar.";
        hidden.dispatchEvent(new Event("input", { bubbles: true }));
      } catch (e) {
        error.textContent = e.message || "Não foi possível abrir esta imagem.";
      } finally {
        file.value = "";
        submit.disabled = false;
      }
    });
    label.append(file);
    wrapper.append(label, note, hidden, preview, remove, error);
    container.append(wrapper);
  }
  function render() {
    $("#stats").replaceChildren();
    [
      [data.tournaments.length, "Torneios"],
      [
        data.tournaments.filter((t) => t.status === "open").length,
        "Inscrições abertas",
      ],
      [data.photos.length, "Fotografias"],
    ].forEach(([count, label]) => {
      const stat = node("div", "stat");
      stat.append(node("strong", "", count), node("span", "", label));
      $("#stats").append(stat);
    });
    const query = $("#search").value.toLocaleLowerCase();
    const filter = $("#filter").value;
    const tournaments = data.tournaments.filter(
      (t) =>
        `${t.name} ${t.location}`.toLocaleLowerCase().includes(query) &&
        (filter === "all" || t.status === filter),
    );
    for (const [collection, entries, target] of [
      ["tournaments", tournaments, "#tournament-list"],
      ["photos", data.photos, "#photo-list"],
    ]) {
      const list = $(target);
      list.replaceChildren();
      entries.forEach((item) => {
        const card = node("article", "admin-card");
        const src = item.image || item.src;
        if (src) {
          const img = node("img");
          img.src = asset(src);
          img.alt = item.alt || item.name;
          img.loading = "lazy";
          card.append(img);
        } else card.append(node("div", "image-placeholder", "♞"));
        const copy = node("div", "card-copy");
        if (item.status)
          copy.append(node("span", `badge ${item.status}`, names[item.status]));
        copy.append(node("h3", "", item.name || item.title));
        copy.append(
          node(
            "p",
            "",
            item.status
              ? `${item.date || "Data a anunciar"}${item.time ? " · " + item.time : ""}\n${item.location}`
              : item.alt,
          ),
        );
        const actions = node("div", "row-actions");
        const edit = node("button", "", "Editar");
        edit.type = "button";
        edit.addEventListener("click", () => openEditor(collection, item));
        const remove = node("button", "danger", "Eliminar");
        remove.type = "button";
        remove.setAttribute(
          "aria-label",
          `Eliminar ${item.name || item.title}`,
        );
        remove.addEventListener("click", async () => {
          if (
            !confirm(
              `Eliminar “${item.name || item.title}”? Este conteúdo deixará de aparecer no site.`,
            )
          )
            return;
          const next = structuredClone(data);
          next[collection] = next[collection].filter((x) => x.id !== item.id);
          try {
            await save(next);
          } catch (e) {
            message(e.message, true);
          }
        });
        actions.append(edit, remove);
        copy.append(actions);
        card.append(copy);
        list.append(card);
      });
      if (!entries.length)
        list.append(
          node(
            "p",
            "empty-content",
            collection === "photos"
              ? "Ainda não existem fotografias. Adicione o primeiro momento."
              : "Nenhum torneio encontrado. Crie um torneio ou ajuste a pesquisa.",
          ),
        );
    }
  }
  function openEditor(collection, item) {
    editing = { collection, item };
    dirty = false;
    message("", false, true);
    const fields = $("#editor-fields");
    fields.replaceChildren();
    $("#editor-title").textContent =
      `${item ? "Editar" : "Novo"} ${collection === "tournaments" ? "torneio" : "registo fotográfico"}`;
    const value = (key) => item?.[key] || "";
    if (collection === "tournaments") {
      labelField(
        fields,
        "name",
        "Nome do torneio",
        value("name"),
        "text",
        true,
        true,
      );
      labelField(
        fields,
        "description",
        "Descrição",
        value("description"),
        "textarea",
        true,
        true,
      );
      labelField(
        fields,
        "category",
        "Categoria (ex.: Juvenil, Rápidas)",
        value("category"),
        "text",
        true,
      );
      labelField(fields, "location", "Local", value("location"), "text", true);
      const mapUrlInput = labelField(
        fields,
        "mapUrl",
        "URL ou código de incorporação do Google Maps (opcional)",
        value("mapUrl"),
        "text",
        false,
        true,
      );
      mapUrlInput.maxLength = 2000;
      const mapNote = node(
        "small",
        "full-width",
        "No Google Maps, use “Partilhar” → “Incorporar um mapa” e cole aqui o URL ou todo o código iframe.",
      );
      mapUrlInput.parentElement.after(mapNote);
      labelField(
        fields,
        "date",
        "Data — deixe vazio se estiver por confirmar",
        value("date"),
        "date",
      );
      labelField(fields, "time", "Hora", value("time"), "time");
      labelField(
        fields,
        "fee",
        "Inscrição / preço (ex.: Gratuito, 200 MZN)",
        value("fee"),
      );
      const label = node("label", "", "Estado");
      const select = node("select");
      select.name = "status";
      Object.entries(names).forEach(([key, text]) => {
        const option = node("option", "", text);
        option.value = key;
        select.append(option);
      });
      select.value = item?.status || "draft";
      label.append(select);
      fields.append(label);
      imageField(fields, "image", value("image"));
    } else {
      labelField(fields, "title", "Título", value("title"), "text", true, true);
      labelField(
        fields,
        "alt",
        "Descrição da imagem (acessibilidade)",
        value("alt"),
        "textarea",
        true,
        true,
      );
      imageField(fields, "src", value("src"), true);
      labelField(
        fields,
        "photographer",
        "Fotógrafo / autor",
        value("photographer"),
      );
      labelField(fields, "source", "Ligação da fonte", value("source"), "url");
      labelField(fields, "license", "Licença / autorização", value("license"));
      labelField(
        fields,
        "licenseUrl",
        "Ligação da licença",
        value("licenseUrl"),
        "url",
      );
    }
    $("#editor").showModal();
    fields.querySelector("input")?.focus();
  }
  function closeEditor() {
    if (busy || (dirty && !confirm("Descartar as alterações por guardar?")))
      return;
    $("#editor").close();
    dirty = false;
    indicator();
  }
  $("#close-editor").addEventListener("click", closeEditor);
  $("#cancel-editor").addEventListener("click", closeEditor);
  $("#editor").addEventListener("cancel", (event) => {
    event.preventDefault();
    closeEditor();
  });
  $("#editor-form").addEventListener("input", () => {
    dirty = true;
    indicator();
  });
  $("#editor-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(event.currentTarget));
    Object.keys(values).forEach((key) => (values[key] = values[key].trim()));
    if (
      editing.collection === "tournaments" &&
      values.mapUrl.includes("<iframe")
    ) {
      const iframe = new DOMParser()
        .parseFromString(values.mapUrl, "text/html")
        .querySelector("iframe");
      const embeddedUrl = iframe?.getAttribute("src")?.trim();
      if (!embeddedUrl)
        return message(
          "Não encontrei o atributo src no código iframe colado.",
          true,
          true,
        );
      values.mapUrl = embeddedUrl;
    }
    if (editing.collection === "photos" && !values.src)
      return message("Escolha uma fotografia antes de guardar.", true, true);
    if (
      (!values.name && editing.collection === "tournaments") ||
      (!values.title && editing.collection === "photos")
    )
      return message("Preencha o nome ou título.", true, true);
    const id = editing.item?.id || crypto.randomUUID();
    const item = { ...values, id };
    if (editing.collection === "tournaments")
      item.registrationKey = editing.item?.registrationKey || id;
    const next = structuredClone(data);
    const index = next[editing.collection].findIndex((x) => x.id === id);
    if (index < 0) next[editing.collection].push(item);
    else next[editing.collection][index] = item;
    try {
      await save(next);
      dirty = false;
      indicator();
      $("#editor").close();
    } catch (e) {
      message(e.message, true, true);
      message(e.message, true);
    }
  });
  function renderPage() {
    const fields = $("#page-fields");
    fields.replaceChildren();
    Object.entries(data.pages[$("#page-select").value]).forEach(
      ([key, field]) => {
        if (field.kind === "image") imageField(fields, key, field.value);
        else
          labelField(
            fields,
            key,
            field.label,
            field.value,
            ["url", "video"].includes(field.kind) ? "url" : "textarea",
            true,
            true,
          );
      },
    );
    pageDirty = false;
    indicator();
  }
  let currentPage = "inicio";
  $("#page-select").addEventListener("change", () => {
    if (pageDirty && !confirm("Descartar as alterações desta página?")) {
      $("#page-select").value = currentPage;
      return;
    }
    currentPage = $("#page-select").value;
    renderPage();
  });
  $("#page-form").addEventListener("input", () => {
    pageDirty = true;
    indicator();
  });
  $("#page-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const next = structuredClone(data);
    for (const [key, value] of new FormData(event.currentTarget))
      next.pages[currentPage][key].value = value.trim();
    try {
      await save(next);
      pageDirty = false;
      indicator();
    } catch (e) {
      message(e.message, true);
    }
  });
  document.querySelectorAll("[data-tab]").forEach((button) =>
    button.addEventListener("click", () => {
      document.querySelectorAll("[data-tab]").forEach((b) => {
        b.removeAttribute("aria-current");
        $(`#${b.dataset.tab}-panel`).hidden = b !== button;
      });
      button.setAttribute("aria-current", "page");
    }),
  );
  $("#new-tournament").addEventListener("click", () =>
    openEditor("tournaments"),
  );
  $("#new-photo").addEventListener("click", () => openEditor("photos"));
  $("#search").addEventListener("input", render);
  $("#filter").addEventListener("change", render);
  async function showDashboard() {
    if (!data) {
      const response = await api("content");
      data = response.data;
      revision = response.revision;
      render();
      renderPage();
    }
    $("#dashboard").hidden = false;
    $("#login-panel").hidden = true;
    $("#logout").hidden = false;
    message("");
    if (dirty && editing) $("#editor").showModal();
  }
  $("#login-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const button = event.currentTarget.querySelector("button");
    button.disabled = true;
    try {
      const result = await api("login", { password: $("#password").value });
      csrf = result.csrf;
      $("#password").value = "";
      await showDashboard();
    } catch (e) {
      message(e.message, true);
    } finally {
      button.disabled = false;
    }
  });
  $("#logout").addEventListener("click", async () => {
    if (unsaved() && !confirm("Sair e descartar as alterações por guardar?"))
      return;
    try {
      await api("logout", {});
      dirty = false;
      pageDirty = false;
      location.reload();
    } catch (e) {
      message(e.message, true);
    }
  });
  (async () => {
    try {
      const session = await api("session");
      csrf = session.csrf;
      if (session.authenticated) await showDashboard();
      else {
        $("#login-panel").hidden = false;
        message("");
      }
    } catch (e) {
      message(
        e.message ||
          "Não foi possível ligar ao Laravel. Inicie com php artisan serve e abra http://localhost:8000/html/admin.html.",
        true,
      );
    }
  })();
})();
