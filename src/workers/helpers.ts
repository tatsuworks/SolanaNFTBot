export function newNotificationsTracker(limit: number = 50) {
  let notifiedTxs: string[] = [];

  return {
    alreadyNotified(tx: string) {
      return notifiedTxs.includes(tx);
    },
    trackNotifiedTx(tx: string) {
      notifiedTxs = [tx, ...notifiedTxs];
      if (notifiedTxs.length > limit) {
        notifiedTxs.pop();
      }
    },
  };
}
