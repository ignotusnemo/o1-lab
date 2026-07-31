const navToggle = document.querySelector(".nav-toggle");
const nav = document.querySelector(".site-nav");

navToggle?.addEventListener("click", () => {
  const open = nav?.classList.toggle("is-open") ?? false;
  navToggle.setAttribute("aria-expanded", String(open));
});

document.addEventListener("click", (event) => {
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
