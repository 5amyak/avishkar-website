module.exports = function isValidEvent(eventName) {
  const events = {
    softablitz: true,
    insomnia: true,
    softathalon: true,
    droidrush: true,
    webster: true,
    operaomnia: true,
    revengg: true,
    tuxwars: true,
    opensource: true,
    logicalrhythm: true,
    codewarriors: true
  };
  if (events[eventName]) return true;
  return false;
};
