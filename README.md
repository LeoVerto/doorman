# Doorman
Doorman is a userscript to assist you in detecting the imposter in Reddit's 2020 April Fools' event!

It first tries to look up answers in a database that has been built in a collaboration
between @abra0 and @JRWR and fed hundreds of answers by countless redditors.

If that lookup fails, doorman falls back to @abra0's [GPT-2 output detector](https://detector.abra.me)
and displays a guess whether the answers was written by a bot or human as a percentage.

Once you get your result, it then transmits back all answers, the chosen one, and whether
that one was right or not.

## Installation
Check out [this website](https://openuserjs.org/about/Userscript-Beginners-HOWTO) for instructions
on how to install a userscript extension for your browser.

Once that's done, opening the raw script file should prompt you to install it:
[https://github.com/LeoVerto/doorman/raw/master/doorman.user.js](https://github.com/LeoVerto/doorman/raw/master/doorman.user.js)