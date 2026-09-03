document.querySelectorAll<HTMLButtonElement>('[data-copy-link]').forEach((button) => {
  button.addEventListener('click', async () => {
    const url = button.dataset.copyLink;
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      button.textContent = 'Copied';
      window.setTimeout(() => {
        button.textContent = 'Copy link';
      }, 1600);
    } catch {
      button.textContent = 'Copy link';
    }
  });
});
