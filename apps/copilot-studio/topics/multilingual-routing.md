# Multilingual routing

The bot detects language on entry through the Foundry classifier. Topic packs are authored once with locale trigger phrases for da, sv, nb, nn, se, en, de, fr, pl, ar, uk, fi. If confidence is low, the language-switch topic asks the citizen to choose a language. Voice fallback preserves the detected locale for STT/TTS.
