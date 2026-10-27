# European Portuguese classroom audio

64 synthetic speech clips, generated with the installed macOS Joana voice (`pt_PT`) at 145 words per minute. AAC mono in M4A containers, 64 kb/s. `manifest.json` maps exact lesson text to each clip. These are synthetic teaching readings, not recordings of a person.

Regenerate on a Mac with Joana installed using `python3 scripts/build-audio.py`. The generator checks file size; verify non-zero duration and browser playback before publishing. No API keys or student recordings are used. The offline build embeds the same clips; the website uses relative audio asset URLs.
