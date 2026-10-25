(function () {
  function position(paper) {
    if (!paper) return;
    const bounds = paper.getBoundingClientRect();
    const left = Math.max(8, bounds.left + 8);
    const right = Math.min(window.innerWidth - 8, bounds.right - 8);

    paper.querySelectorAll(".tooltip").forEach((tooltip) => {
      const transition = tooltip.style.transition;
      // Measure the unshifted box, not an in-flight transform from a resize.
      tooltip.style.transition = "none";
      tooltip.style.removeProperty("--tooltip-x");
      if (tooltip.classList.contains("usage-tooltip")) {
        tooltip.style.maxWidth = `${Math.max(0, right - left)}px`;
      }
      const rect = tooltip.getBoundingClientRect();
      const targetLeft = Math.max(left, Math.min(rect.left, right - rect.width));
      tooltip.style.setProperty("--tooltip-x", `${targetLeft - rect.left}px`);
      tooltip.getBoundingClientRect();
      tooltip.style.transition = transition;
    });
  }

  window.RpthTooltips = { position };
})();
