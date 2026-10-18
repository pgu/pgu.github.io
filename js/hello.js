// A friendly note in the browser console, different on every load, in rainbow colours.
(function () {
  if (!window.console || !console.log) return;

  var SENTENCES = [
    'You are doing better than you think.',
    'Small steps still move you forward.',
    'Today is a good day to learn something new.',
    'Be kind to yourself, you are a work in progress.',
    'Curiosity is a superpower. Keep it on.',
    'Every expert was once a beginner.',
    'Take a deep breath. You have got this.',
    'Done is better than perfect.',
    'Good things take time, and you are on your way.',
    'Your next idea might be the one.',
    'It is okay to take a break. Really.',
    'Make something you are proud of today.',
    'Stay curious, stay kind, keep shipping.',
    'Progress, not perfection.',
    'Someone out there is glad you exist.',
    'Bugs are just surprises with a stack trace.',
    'The best code is the one you can read next month.',
    'A little patience goes a long way.',
    'You can do hard things.',
    'Celebrate the small wins, they add up.'
  ];

  var text = SENTENCES[Math.floor(Math.random() * SENTENCES.length)];

  // tiny logo (figlet "small" font), one line per console row
  var LOGO = [
    ' ___  ___ _   _ ',
    '| _ \\/ __| | | |',
    '|  _/ (_ | |_| |',
    '|_|  \\___|\\___/ '
  ];

  // rainbow: one colour per character, the hue walks around the wheel from a random starting point
  var start = Math.floor(Math.random() * 360);
  function rainbow(str, style, span) {
    var fmt = '', css = [];
    for (var i = 0; i < str.length; i++) {
      fmt += '%c' + str[i];
      css.push(style + ' color: hsl(' + ((start + i * (span / str.length)) % 360).toFixed(0) + ' 85% 62%);');
    }
    console.log.apply(console, [fmt].concat(css));
  }

  LOGO.forEach(function (row) { rainbow(row, 'font: 700 13px/1.15 ui-monospace, Menlo, Consolas, monospace;', 200); });
  rainbow(text, 'font: 700 18px/1.6 -apple-system, "Segoe UI", sans-serif;', 300);
  console.log('%cHello, curious developer. Have a good day.', 'font: 12px -apple-system, "Segoe UI", sans-serif; color: #8d9bb8;');
})();
