// Set to false when the core repository becomes public.
const PRIVATE_REPOSITORY_GATE = true;

const repositoryGateCopy = {
  en: {
    dialog: "Parano1d source code access",
    closeLabel: "Close message",
    eyebrow: "Source code",
    title: "Code opens before launch.",
    body: "The core repository remains private during the final preparation stage. The code for the upcoming release will be published before the public network launches.",
    launch: "Public network launch · August 2026",
    contact: "Contact developer",
    dismiss: "Close"
  },
  ru: {
    dialog: "Доступ к исходному коду Parano1d",
    closeLabel: "Закрыть сообщение",
    eyebrow: "Исходный код",
    title: "Код откроется перед запуском.",
    body: "Основной репозиторий остаётся закрытым на финальном этапе подготовки. Код будущего релиза будет опубликован перед запуском публичной сети.",
    launch: "Запуск публичной сети · август 2026",
    contact: "Связаться с разработчиком",
    dismiss: "Закрыть"
  },
  zh: {
    dialog: "Parano1d 源代码访问说明",
    closeLabel: "关闭提示",
    eyebrow: "源代码",
    title: "代码将在网络启动前公开。",
    body: "核心代码仓库将在最终准备阶段保持私有。即将发布版本的代码将在公共网络启动前公开。",
    launch: "公共网络启动 · 2026 年 8 月",
    contact: "联系开发者",
    dismiss: "关闭"
  }
};

function isPrivateRepositoryLink(link) {
  if (!PRIVATE_REPOSITORY_GATE || !(link instanceof HTMLAnchorElement)) return false;
  try {
    const url = new URL(link.href, location.href);
    return url.hostname.toLowerCase() === "github.com"
      && /^\/ignotusnemo\/parano1d(?:\/|$)/i.test(url.pathname);
  } catch {
    return false;
  }
}

const repositoryGateLanguage = document.documentElement.lang.startsWith("ru")
  ? "ru"
  : document.documentElement.lang.startsWith("zh")
    ? "zh"
    : "en";
const repositoryGateText = repositoryGateCopy[repositoryGateLanguage];
const repositoryGate = document.createElement("section");
repositoryGate.className = "repository-gate-layer";
repositoryGate.hidden = true;
repositoryGate.setAttribute("role", "dialog");
repositoryGate.setAttribute("aria-modal", "true");
repositoryGate.setAttribute("aria-label", repositoryGateText.dialog);
repositoryGate.innerHTML = `
  <div class="repository-gate-dialog">
    <button class="repository-gate-close" type="button" aria-label="${repositoryGateText.closeLabel}">
      <svg viewBox="0 0 16 16" aria-hidden="true"><path d="m3 3 10 10M13 3 3 13"/></svg>
    </button>
    <p class="repository-gate-eyebrow">${repositoryGateText.eyebrow}</p>
    <h2>${repositoryGateText.title}</h2>
    <p class="repository-gate-copy">${repositoryGateText.body}</p>
    <div class="repository-gate-meta">
      <p>${repositoryGateText.launch}</p>
      <p>${repositoryGateText.contact} · <a href="mailto:dev@parano1d.org">dev@parano1d.org</a></p>
    </div>
    <button class="repository-gate-dismiss" type="button">${repositoryGateText.dismiss}</button>
  </div>`;
document.body.append(repositoryGate);

const repositoryGateClose = repositoryGate.querySelector(".repository-gate-close");
const repositoryGateDismiss = repositoryGate.querySelector(".repository-gate-dismiss");
let repositoryGateLastFocus = null;
let repositoryGateCloseTimer = 0;

function openRepositoryGate() {
  if (!repositoryGate.hidden) return;
  clearTimeout(repositoryGateCloseTimer);
  repositoryGateLastFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  repositoryGate.hidden = false;
  document.body.classList.add("repository-gate-open");
  requestAnimationFrame(() => {
    repositoryGate.classList.add("is-open");
    repositoryGateClose?.focus({ preventScroll: true });
  });
}

function closeRepositoryGate() {
  if (repositoryGate.hidden) return;
  repositoryGate.classList.remove("is-open");
  document.body.classList.remove("repository-gate-open");
  repositoryGateCloseTimer = setTimeout(() => { repositoryGate.hidden = true; }, 220);
  repositoryGateLastFocus?.focus?.({ preventScroll: true });
}

function gatePrivateRepositoryNavigation(event) {
  const link = event.target instanceof Element ? event.target.closest("a[href]") : null;
  if (!isPrivateRepositoryLink(link)) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  openRepositoryGate();
}

document.addEventListener("click", gatePrivateRepositoryNavigation, true);
document.addEventListener("auxclick", gatePrivateRepositoryNavigation, true);
repositoryGateClose?.addEventListener("click", closeRepositoryGate);
repositoryGateDismiss?.addEventListener("click", closeRepositoryGate);
repositoryGate.addEventListener("click", (event) => {
  if (event.target === repositoryGate) closeRepositoryGate();
});
repositoryGate.addEventListener("keydown", (event) => {
  if (event.key !== "Tab") return;
  const controls = [...repositoryGate.querySelectorAll("a[href], button:not([disabled])")];
  const first = controls[0];
  const last = controls[controls.length - 1];
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
});
document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape" || repositoryGate.hidden) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  closeRepositoryGate();
}, true);

const navToggle = document.querySelector(".nav-toggle");
const nav = document.querySelector(".site-nav");
const languageSwitchers = [...document.querySelectorAll(".language-switcher")];

navToggle?.addEventListener("click", () => {
  const open = nav?.classList.toggle("is-open") ?? false;
  navToggle.setAttribute("aria-expanded", String(open));
});

document.addEventListener("click", (event) => {
  for (const switcher of languageSwitchers) {
    if (!switcher.contains(event.target)) switcher.removeAttribute("open");
  }
  if (!nav?.classList.contains("is-open")) return;
  if (nav.contains(event.target) || navToggle?.contains(event.target)) return;
  nav.classList.remove("is-open");
  navToggle?.setAttribute("aria-expanded", "false");
});

const filters = [...document.querySelectorAll("[data-filter]")];
const rows = [...document.querySelectorAll(".archive-row[data-topic]")];
const empty = document.querySelector(".filter-empty");

for (const filter of filters) {
  filter.addEventListener("click", () => {
    const value = filter.dataset.filter;
    for (const button of filters) button.classList.toggle("is-active", button === filter);
    let visible = 0;
    for (const row of rows) {
      const show = value === "all" || row.dataset.topic === value;
      row.hidden = !show;
      if (show) visible += 1;
    }
    if (empty) empty.hidden = visible !== 0;
  });
}

const progress = document.querySelector(".reading-progress span");
if (progress) {
  const updateProgress = () => {
    const max = document.documentElement.scrollHeight - innerHeight;
    const ratio = max > 0 ? Math.min(1, Math.max(0, scrollY / max)) : 0;
    progress.style.width = `${ratio * 100}%`;
  };
  addEventListener("scroll", updateProgress, { passive: true });
  addEventListener("resize", updateProgress, { passive: true });
  updateProgress();
}

const tocLinks = [...document.querySelectorAll(".article-toc a")];
if (tocLinks.length) {
  const headings = tocLinks.map((link) => document.querySelector(link.hash)).filter(Boolean);
  const observer = new IntersectionObserver((entries) => {
    const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
    if (!visible) return;
    for (const link of tocLinks) link.classList.toggle("is-active", link.hash === `#${visible.target.id}`);
  }, { rootMargin: "-12% 0px -72% 0px", threshold: 0 });
  for (const heading of headings) observer.observe(heading);
}

const copyButtons = [...document.querySelectorAll("[data-copy-link]")];

async function copyText(value) {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(value);
      return;
    } catch {
      // Clipboard API may exist but still be blocked by browser policy.
      // Continue with the user-gesture fallback below.
    }
  }

  const field = document.createElement("textarea");
  field.value = value;
  field.setAttribute("readonly", "");
  field.style.position = "fixed";
  field.style.inset = "-1000px auto auto -1000px";
  field.style.width = "1px";
  field.style.height = "1px";
  document.body.append(field);
  field.focus({ preventScroll: true });
  field.select();
  field.setSelectionRange(0, field.value.length);

  const onCopy = (event) => {
    if (!event.clipboardData) return;
    event.clipboardData.setData("text/plain", value);
    event.preventDefault();
  };

  document.addEventListener("copy", onCopy);
  let copied = false;
  try {
    copied = document.execCommand("copy");
  } finally {
    document.removeEventListener("copy", onCopy);
  }
  field.remove();
  if (!copied) throw new Error("Copy command failed");
}

for (const button of copyButtons) {
  button.addEventListener("click", async () => {
    const label = button.querySelector("[data-copy-label]");
    const defaultLabel = button.dataset.copyDefault || "Copy link";
    const successLabel = button.dataset.copySuccess || "Copied";
    const failureLabel = button.dataset.copyFailure || "Copy failed";
    try {
      await copyText(button.dataset.copyLink || location.href);
      button.classList.add("is-copied");
      if (label) label.textContent = successLabel;
      clearTimeout(button.copyResetTimer);
      button.copyResetTimer = setTimeout(() => {
        button.classList.remove("is-copied");
        if (label) label.textContent = defaultLabel;
      }, 2200);
    } catch {
      if (label) label.textContent = failureLabel;
    }
  });
}
