(async () => {
  await window.chessmentReady;
  const { root } = window.ChessMent;
  const modal = document.querySelector("#inscricaoModal");
  const form = document.querySelector("#tournamentForm");
  const formTitle = document.querySelector("#formTitle");
  const tournamentField = document.querySelector("#tournamentName");
  const status = document.querySelector("#formStatus");
  const roster = document.querySelector("#registrantsList");
  const rosterCount = document.querySelector("#registrantsCount");
  const registerPanel = document.querySelector("#registrationPanel");
  const cards = [...document.querySelectorAll(".tournament-card")];
  let activeTournament = "";
  let activeId = "";
  let csrf = "";
  const registrations = new Map();

  if (!modal || !form) return;

  async function api(path, options = {}) {
    const headers = new Headers(options.headers || {});
    headers.set("Accept", "application/json");
    const response = await fetch(new URL(`api/${path}`, root), {
      ...options,
      headers,
    });
    let result;
    try {
      result = await response.json();
    } catch {
      throw new Error(
        "Não foi possível ligar ao servidor. Abra o site através do Laravel.",
      );
    }
    if (!response.ok)
      throw new Error(
        result.message || "Não foi possível concluir a operação.",
      );
    return result;
  }

  async function getEntries(tournamentId) {
    const result = await api(
      `registrations?tournament_id=${encodeURIComponent(tournamentId)}`,
    );
    registrations.set(tournamentId, result.entries);
    return result.entries;
  }

  function showStatus(message, error = false) {
    status.textContent = message;
    status.classList.toggle("error", error);
    status.classList.toggle("show", Boolean(message));
  }

  function renderRoster(entries) {
    roster.replaceChildren();
    rosterCount.textContent = `${entries.length} ${entries.length === 1 ? "inscrito" : "inscritos"}`;

    if (!entries.length) {
      const empty = document.createElement("li");
      empty.className = "empty-list";
      empty.textContent =
        "Ainda não há inscrições. Seja o primeiro a participar!";
      roster.append(empty);
      return;
    }

    entries.forEach((entry, index) => {
      const item = document.createElement("li");
      const name = document.createElement("strong");
      const level = document.createElement("span");
      name.textContent = `${index + 1}. ${entry.name}`;
      level.textContent = entry.level;
      item.append(name, level);
      roster.append(item);
    });
  }

  async function updateRoster() {
    roster.replaceChildren();
    rosterCount.textContent = "A carregar…";
    try {
      renderRoster(await getEntries(activeId));
    } catch (error) {
      rosterCount.textContent = "Indisponível";
      const item = document.createElement("li");
      item.className = "empty-list";
      item.textContent = error.message;
      roster.append(item);
    }
  }

  async function updateCardCounts() {
    await Promise.all(
      cards.map(async (card) => {
        const id = card.dataset.registrationId;
        const output = card.querySelector("[data-registration-count]");
        if (!output || !id) return;
        try {
          const entries = registrations.has(id)
            ? registrations.get(id)
            : await getEntries(id);
          output.textContent = `${entries.length} ${entries.length === 1 ? "inscrito" : "inscritos"}`;
        } catch {
          output.textContent = "— inscritos";
        }
      }),
    );
  }

  function openModal(tournament, showForm, id) {
    activeTournament = tournament;
    activeId = id;
    tournamentField.value = tournament;
    formTitle.textContent = showForm
      ? "Inscrever-se no torneio"
      : "Inscritos no torneio";
    registerPanel.hidden = !showForm;
    showStatus("");
    void updateRoster();
    modal.classList.add("open");
    modal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    if (showForm) document.querySelector("#nome").focus();
    else modal.querySelector(".close-btn").focus();
  }

  function closeModal() {
    modal.classList.remove("open");
    modal.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
  }

  cards.forEach((card) => {
    card.querySelector(".card-button")?.addEventListener("click", () => {
      openModal(card.dataset.tournament, true, card.dataset.registrationId);
    });
    card.querySelector(".list-button")?.addEventListener("click", () => {
      openModal(card.dataset.tournament, false, card.dataset.registrationId);
    });
  });

  modal.querySelector(".close-btn")?.addEventListener("click", closeModal);
  modal.addEventListener("click", (event) => {
    if (event.target === modal) closeModal();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && modal.classList.contains("open"))
      closeModal();
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const data = new FormData(form);
    const name = String(data.get("nome") || "").trim();
    const email = String(data.get("email") || "")
      .trim()
      .toLowerCase();
    const levelLabel =
      form.querySelector("#nivel option:checked")?.textContent || "";
    const submit = form.querySelector('[type="submit"]');
    submit.disabled = true;
    showStatus("A guardar a inscrição…");
    try {
      if (!csrf) csrf = (await api("session")).csrf;
      await api("registrations", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-CSRF-Token": csrf },
        body: JSON.stringify({
          tournament_id: activeId,
          name,
          email,
          level: levelLabel,
        }),
      });
      registrations.delete(activeId);
      form.reset();
      tournamentField.value = activeTournament;
      await Promise.all([updateRoster(), updateCardCounts()]);
      showStatus(
        "Inscrição confirmada! O seu nome já aparece na lista deste torneio.",
      );
    } catch (error) {
      showStatus(error.message, true);
    } finally {
      submit.disabled = false;
    }
  });

  void updateCardCounts();
})();
