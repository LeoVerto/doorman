# Doorman
Doorman is a userscript to help you keep the imposters out in Reddit's
[2020 April Fools' event](https://new.reddit.com/r/Imposter)!

It first tries to look up answers in a database that has been built in a collaboration
between [@abra0](https://github.com/Abrackadabra) and [@JRWR](https://github.com/JRWR)
and fed hundreds of thousands of answers by countless redditors.

As another data source, it checks against the database of [The Ocean](https://ocean.rip).

If that lookup fails, doorman falls back to [@abra0](https://github.com/Abrackadabra)'s
[GPT-2 output detector](https://detector.abra.me) and displays a guess whether the answers was written
by a bot or human as a percentage.

Once you get your result, it then transmits back all answers, the chosen one, and whether
that one was right or not.

## Installation
Check out [this website](https://openuserjs.org/about/Userscript-Beginners-HOWTO) for instructions
on how to install a userscript extension for your browser.

Once that's done, opening the raw script file should prompt you to install it:
[https://github.com/LeoVerto/doorman/raw/master/doorman.user.js](https://github.com/LeoVerto/doorman/raw/master/doorman.user.js)
