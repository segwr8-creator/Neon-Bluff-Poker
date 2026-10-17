// Prepared Google Ad Manager adapter. Not enabled in the live economy.
// A browser event is NOT proof of an earned server-side Stack Dollar credit.
let loading, busy = false;
function loadTag() {
  if (window.googletag?.apiReady) return Promise.resolve(window.googletag);
  if (loading) return loading;
  loading = new Promise((resolve, reject) => {
    window.googletag = window.googletag || {cmd: []};
    const script = document.createElement('script');
    script.async = true;
    script.src = 'https://securepubads.g.doubleclick.net/tag/js/gpt.js';
    const timer = setTimeout(fail, 12000);
    function fail() { clearTimeout(timer); script.remove(); loading = null; reject(new Error('Ads are unavailable. You can continue without watching.')); }
    script.onerror = fail;
    window.googletag.cmd.push(() => { clearTimeout(timer); resolve(window.googletag); });
    document.head.append(script);
  });
  return loading;
}

// Invoke only after an explicit Watch ad click and the site's privacy/consent flow.
// Never automatically show at page load, at a table, or on a countdown.
export async function showWebReward({adUnitPath, consentReady, optedIn}) {
  if (!consentReady || !optedIn) throw new Error('Choose Watch ad after completing privacy choices.');
  if (!/^\/\d+\/[A-Za-z0-9_./-]+$/.test(adUnitPath || '')) throw new Error('Rewarded ads have not been configured.');
  if (busy) throw new Error('An ad is already open.');
  busy = true;
  try {
    const tag = await loadTag();
    return await new Promise((resolve, reject) => {
      const slot = tag.defineOutOfPageSlot(adUnitPath, tag.enums.OutOfPageFormat.REWARDED);
      if (!slot) { reject(new Error('Rewarded ads are unavailable on this device.')); return; }
      const ads = tag.pubads();
      slot.addService(ads);
      let granted = false, shown = false, settled = false;
      const timer = setTimeout(() => finish(new Error('No ad is available right now. Please try later.')), 20000);
      const listeners = {
        rewardedSlotReady(event) {
          if (event.slot !== slot || settled || shown) return;
          shown = true;
          clearTimeout(timer);
          try { if (!event.makeRewardedVisible()) finish(new Error('Unable to display this ad.')); }
          catch { finish(new Error('Unable to display this ad.')); }
        },
        rewardedSlotGranted(event) { if (event.slot === slot && shown) granted = true; },
        rewardedSlotClosed(event) { if (event.slot === slot) finish(); },
        slotRenderEnded(event) { if (event.slot === slot && event.isEmpty) finish(new Error('No ad is available right now. Please try later.')); }
      };
      function finish(error) {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        for (const [name, listener] of Object.entries(listeners)) ads.removeEventListener(name, listener);
        tag.destroySlots([slot]);
        // Caller must not use this unsigned result to credit the bank.
        if (error) reject(error); else resolve({completed: granted, verified: false});
      }
      for (const [name, listener] of Object.entries(listeners)) ads.addEventListener(name, listener);
      tag.enableServices();
      tag.display(slot);
    });
  } finally { busy = false; }
}
