Mangisoz External API

Base URL: `https://mangisoz.nu.edu.kz/external-api/v1`

Authenticate every request with a bearer token:

```
Authorization: Bearer YOUR_TOKEN
```

Supported language codes: `kaz`, `eng`, `tur`, `rus`.

---

Translate text  
`POST /translate/text/`

Translate plain text between languages. You can optionally request spoken output.

Query params:
- `output_format` (optional) — `text` (default) or `audio`.
- `output_voice` (optional) — `male` or `female` when `output_format=audio`.

JSON body:
- `source_language` (required) — one of the supported codes.
- `target_language` (required) — one of the supported codes.
- `text` (required) — text to translate.

Response:
- `text` — translated text.
- `audio` — base16 audio string (only when `output_format=audio`).

Example:

```
curl --location 'https://mangisoz.nu.edu.kz/external-api/v1/translate/text/?output_format=text' \
  --header 'Authorization: Bearer YOUR_TOKEN' \
  --header 'Content-Type: application/json' \
  --data-raw '{
    "source_language": "eng",
    "target_language": "kaz",
    "text": "Hello world"
  }'
```

---

Translate audio (base16 payload)  
`POST /translate/audio/`

Translate audio content provided as a base16-encoded string.

Query params:
- `output_format` (optional) — `text` (default) or `audio`.
- `output_voice` (optional) — `male` or `female` when `output_format=audio`.

JSON body:
- `target_language` (required) — target language code.
- `audio` (required) — base16-encoded audio string.

Response:
- `text` — translated transcript.
- `audio` — base16 audio string (only when `output_format=audio`).

Example:

```
curl --location 'https://mangisoz.nu.edu.kz/external-api/v1/translate/audio/?output_format=audio&output_voice=male' \
  --header 'Authorization: Bearer YOUR_TOKEN' \
  --header 'Content-Type: application/json' \
  --data '{
    "target_language": "eng",
    "audio": "BASE16_ENCODED_AUDIO_STRING"
  }'
```

---

Transcribe audio file  
`POST /transcript/transcript_audio/`

Upload an audio file (form data) to get a text transcript.

Form data:
- `file` (required) — `.wav` file.

Response:
- `transcription_text` — transcript of the audio.

Example:

```
curl --location 'https://mangisoz.nu.edu.kz/external-api/v1/transcript/transcript_audio/' \
  --header 'Authorization: Bearer YOUR_TOKEN' \
  --form 'file=@/path/to/audio.wav'
```

---

Translate document file  
`POST /translate/file/`

Translate a document file (form data) and receive the translated file as binary output.

Form data:
- `source_language` (required) — original language code.
- `target_language` (required) — target language code.
- `file` (required) — `.docx` or `.pdf`.

Response:
- Binary `.docx` file (download the response body).

Example:

```
curl --location 'https://mangisoz.nu.edu.kz/external-api/v1/translate/file/' \
  --header 'Authorization: Bearer YOUR_TOKEN' \
  --form 'source_language="eng"' \
  --form 'target_language="kaz"' \
  --form 'file=@"/path/to/hello.docx"'
```
