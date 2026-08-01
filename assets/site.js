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
