# European Portuguese neural classroom audio

Natural neural synthesis replaces the earlier macOS Joana recordings. The fixed public lesson phrases use Microsoft pt-PT-RaquelNeural (female); the dialogue partner B uses pt-PT-DuarteNeural (male). These are synthetic voices, not recordings of human speakers. Voice definitions: https://learn.microsoft.com/en-us/azure/ai-services/speech-service/language-support

Speech is generated at -5% rate, preserving normal sentence rhythm. AAC mono in M4A containers, 64 kb/s. `manifest.json` maps exact text to clips; `B|` keys identify the partner's voice. `provenance.json` records voices, rate and clip count. Hashed filenames include voice and rate so browsers load the new recordings.

Install `edge-tts` from PyPI, then run `python3 scripts/build-audio.py` on macOS (uses `afconvert`). Generation requires a network connection; playback uses only bundled files. The generator retries failed requests and writes the manifest after all clips succeed. No credentials or student recordings are involved. Verify duration and browser playback before publishing. The offline build embeds the same audio.

Generator documentation: https://github.com/rany2/edge-tts
