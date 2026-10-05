const sourceCopy = {
  en: { title: "Source code", close: "Close source selection", unavailable: "Temporarily unavailable" },
  ru: { title: "Исходный код", close: "Закрыть выбор репозитория", unavailable: "Временно недоступен" },
  zh: { title: "源代码", close: "关闭仓库选择", unavailable: "暂时不可用" }
};
const sourceLanguage = document.documentElement.lang.startsWith("ru") ? "ru"
  : document.documentElement.lang.startsWith("zh") ? "zh" : "en";
const sourceText = sourceCopy[sourceLanguage];
const sourceDialog = document.createElement("dialog");
sourceDialog.id = "source-dialog";
sourceDialog.className = "source-dialog";
sourceDialog.setAttribute("aria-labelledby", "source-dialog-title");
sourceDialog.innerHTML =
  '<div class="source-dialog-card">' +
    '<button class="source-dialog-close" type="button" autofocus aria-label="' + sourceText.close + '">' +
      '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="m3 3 10 10M13 3 3 13"/></svg>' +
    '</button>' +
    '<h2 id="source-dialog-title">' + sourceText.title + '</h2>' +
    '<div class="source-providers">' +
      '<a class="source-provider" href="https://github.com/ignotusnemo/parano1d" target="_blank" rel="noopener noreferrer">' +
        '<span><b>GitHub (ignotusnemo)</b><small>github.com/ignotusnemo</small></span><span aria-hidden="true">↗</span>' +
      '</a>' +
      '<a class="source-provider" href="https://git.parano1d.org/ignotusnemo/parano1d" target="_blank" rel="noopener noreferrer">' +
        '<span><b>Forgejo (canonical)</b><small>git.parano1d.org</small></span><span aria-hidden="true">↗</span>' +
      '</a>' +
      '<a class="source-provider" href="https://gitlab.com/ignotusnemo/parano1d" target="_blank" rel="noopener noreferrer">' +
        '<span><b>GitLab (mirror)</b><small>gitlab.com</small></span><span aria-hidden="true">↗</span>' +
      '</a>' +
      '<a class="source-provider" href="https://github.com/proof-native/parano1d" target="_blank" rel="noopener noreferrer">' +
        '<span><b>GitHub (mirror)</b><small>github.com/proof-native</small></span><span aria-hidden="true">↗</span>' +
      '</a>' +
    '</div>' +
  '</div>';
document.body.append(sourceDialog);
let sourceReturnFocus = null;
let sourceBodyOverflow = "";
document.querySelectorAll("[data-source-open]").forEach((opener) => {
  opener.addEventListener("click", () => {
    if (sourceDialog.open) return;
    const toggle = document.querySelector(".nav-toggle");
    const menu = document.querySelector(".site-nav");
    const mobile = toggle && getComputedStyle(toggle).display !== "none";
    sourceReturnFocus = mobile ? toggle : opener;
    menu?.classList.remove("is-open");
    toggle?.setAttribute("aria-expanded", "false");
    document.querySelectorAll(".language-switcher[open]").forEach((item) => item.removeAttribute("open"));
    sourceBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    sourceDialog.showModal();
  });
});
sourceDialog.querySelector(".source-dialog-close").addEventListener("click", () => sourceDialog.close());
sourceDialog.addEventListener("click", (event) => {
  if (event.target === sourceDialog) sourceDialog.close();
});
sourceDialog.addEventListener("close", () => {
  document.body.style.overflow = sourceBodyOverflow;
  sourceReturnFocus?.focus({ preventScroll: true });
});

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

const homeResearchGrid = document.querySelector("[data-home-research-grid]");
const homeResearchPager = document.querySelector("[data-home-research-pager]");

if (homeResearchGrid && homeResearchPager) {
  const cards = [...homeResearchGrid.querySelectorAll(":scope > .research-card")];
  const pageSize = Math.max(1, Number(homeResearchGrid.dataset.pageSize) || 6);
  const pageCount = Math.max(1, Math.ceil(cards.length / pageSize));
  const pageButtons = [...homeResearchPager.querySelectorAll("[data-home-research-page]")];
  const previousButton = homeResearchPager.querySelector('[data-home-research-action="previous"]');
  const nextButton = homeResearchPager.querySelector('[data-home-research-action="next"]');
  const currentOutput = homeResearchPager.querySelector("[data-home-research-current]");
  const totalOutput = homeResearchPager.querySelector("[data-home-research-total]");
  let currentPage = 1;

  const pageFromLocation = () => {
    const value = Number(new URL(window.location.href).searchParams.get("research-page"));
    return Number.isInteger(value) && value >= 1 && value <= pageCount ? value : 1;
  };

  const renderPage = (page, { scroll = false, updateHistory = false } = {}) => {
    currentPage = Math.min(pageCount, Math.max(1, page));
    const start = (currentPage - 1) * pageSize;
    const end = start + pageSize;
    cards.forEach((card, index) => { card.hidden = index < start || index >= end; });
    pageButtons.forEach((button) => {
      const active = Number(button.dataset.homeResearchPage) === currentPage;
      if (active) button.setAttribute("aria-current", "page");
      else button.removeAttribute("aria-current");
    });
    if (previousButton) previousButton.disabled = currentPage === 1;
    if (nextButton) nextButton.disabled = currentPage === pageCount;
    if (currentOutput) currentOutput.textContent = String(currentPage).padStart(2, "0");
    if (totalOutput) totalOutput.textContent = String(pageCount).padStart(2, "0");

    if (updateHistory) {
      const url = new URL(window.location.href);
      if (currentPage === 1) url.searchParams.delete("research-page");
      else url.searchParams.set("research-page", String(currentPage));
      url.hash = "latest";
      history.pushState({ researchPage: currentPage }, "", url);
    }

    if (scroll) {
      homeResearchGrid.scrollIntoView({
        block: "start",
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth"
      });
    }
  };

  pageButtons.forEach((button) => button.addEventListener("click", () => {
    renderPage(Number(button.dataset.homeResearchPage), { scroll: true, updateHistory: true });
  }));
  previousButton?.addEventListener("click", () => renderPage(currentPage - 1, { scroll: true, updateHistory: true }));
  nextButton?.addEventListener("click", () => renderPage(currentPage + 1, { scroll: true, updateHistory: true }));
  window.addEventListener("popstate", () => renderPage(pageFromLocation()));

  homeResearchPager.hidden = pageCount <= 1;
  renderPage(pageFromLocation());
}

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
