(async () => {
const content = await window.chessmentReady;
let photos = [
  {
    src: "../public/img/72.jpg",
    alt: "Participantes numa actividade de xadrez",
    title: "Encontro de xadrez",
  },
  {
    src: "../public/img/77.jpg",
    alt: "Jogadores concentrados durante uma partida",
    title: "Concentração em cada lance",
  },
  {
    src: "../public/img/78.jpg",
    alt: "Momento de convívio da comunidade de xadrez",
    title: "Comunidade ChessMent",
  },
  {
    src: "../public/img/74.jpg",
    alt: "Jovens a jogar xadrez",
    title: "Novos talentos",
  },
  {
    src: "../public/img/chessment.jpeg",
    alt: "Actividade de xadrez em Moçambique",
    title: "Xadrez em Moçambique",
  },
  {
    src: "https://upload.wikimedia.org/wikipedia/commons/1/1b/Magnus_Carlsen_2013-05-24_001.jpg",
    alt: "O grande mestre Magnus Carlsen, campeão mundial de xadrez",
    title: "Magnus Carlsen — foco de campeão",
    photographer: "Catharina Caprino",
    source:
      "https://commons.wikimedia.org/wiki/File:Magnus_Carlsen_2013-05-24_001.jpg",
    license: "CC BY 3.0",
    licenseUrl: "https://creativecommons.org/licenses/by/3.0/",
  },
  {
    src: "https://upload.wikimedia.org/wikipedia/commons/thumb/0/07/Garry_Kasparov_%28Luzern_1982%29.jpg/960px-Garry_Kasparov_%28Luzern_1982%29.jpg",
    alt: "Garry Kasparov na Olimpíada de Xadrez de 1982, em Lucerna",
    title: "Garry Kasparov — estratégia e audácia",
    photographer: "Klaus Krtschil",
    source:
      "https://commons.wikimedia.org/wiki/File:Garry_Kasparov_(Luzern_1982).jpg",
    license: "CC BY-SA 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/",
  },
  {
    src: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/85/Judit_Polg%C3%A1r_2013.jpg/960px-Judit_Polg%C3%A1r_2013.jpg",
    alt: "A grande mestre Judit Polgár no Campeonato Europeu de Equipas de 2013",
    title: "Judit Polgár — talento e determinação",
    photographer: "Przemysław Jahr",
    source:
      "https://commons.wikimedia.org/wiki/File:Judit_Polg%C3%A1r_2013.jpg",
    license: "CC BY-SA 3.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/3.0/",
  },
];

if (content) {
  photos = content.photos.map(photo => ({...photo, src: window.ChessMent.asset(photo.src)}));
  const grid = document.querySelector('#photoGrid');
  grid.replaceChildren();
  if (!photos.length) {
    grid.textContent = 'Em breve partilharemos novos momentos da comunidade.';
    return;
  }
  photos.slice(0,4).forEach(photo => {
    const {node} = window.ChessMent;
    const card = node('figure','gallery-item');
    const img = node('img','gallery-photo'); img.src=photo.src;img.alt=photo.alt;
    const caption = node('figcaption','gallery-caption');
    const credit = node('span','gallery-credit'); renderCredit(credit,photo);
    caption.append(node('span','gallery-title',photo.title),credit);
    card.append(img,caption);grid.append(card);
  });
}
const cards = Array.from(document.querySelectorAll(".gallery-item"));
const fadeDuration = 1500;
let rotation = 0;
let isUpdating = false;

function preloadPhoto(photo) {
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = resolve;
    image.onerror = resolve;
    image.src = photo.src;
  });
}

function renderCredit(element, photo) {
  element.replaceChildren();
  if (photo.photographer) element.textContent = `Fotografia: ${photo.photographer}`;
  if (
    !photo.photographer ||
    !photo.source ||
    !photo.license ||
    !photo.licenseUrl
  ) {
    return;
  }
  element.replaceChildren();

  const sourceLink = document.createElement("a");
  sourceLink.href = photo.source;
  sourceLink.target = "_blank";
  sourceLink.rel = "noopener noreferrer";
  sourceLink.textContent = photo.source.includes('commons.wikimedia.org') ? 'Wikimedia Commons' : 'Fonte';

  const licenseLink = document.createElement("a");
  licenseLink.href = photo.licenseUrl;
  licenseLink.target = "_blank";
  licenseLink.rel = "noopener noreferrer";
  licenseLink.textContent = photo.license;

  element.append(
    `Fotografia: ${photo.photographer} / `,
    sourceLink,
    " — ",
    licenseLink,
  );
}

async function rotatePhotos() {
  if (isUpdating) return;
  isUpdating = true;

  const nextPhotos = cards.map(
    (_, cardIndex) => photos[(rotation + cardIndex) % photos.length],
  );
  await Promise.all(nextPhotos.map(preloadPhoto));

  cards.forEach((card) =>
    card.querySelector(".gallery-photo").classList.add("is-fading"),
  );

  window.setTimeout(() => {
    cards.forEach((card, cardIndex) => {
      const photo = nextPhotos[cardIndex];
      const image = card.querySelector(".gallery-photo");

      image.src = photo.src;
      image.alt = photo.alt;
      card.querySelector(".gallery-title").textContent = photo.title;
      renderCredit(card.querySelector(".gallery-credit"), photo);
      image.classList.remove("is-fading");
    });

    rotation = (rotation + 1) % photos.length;
    isUpdating = false;
  }, fadeDuration);
}

if (photos.length > cards.length && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) window.setInterval(rotatePhotos, 5000);
})();
