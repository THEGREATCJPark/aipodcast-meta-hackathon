"""Editorial title cards only. Never reconstructs the application or model output."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

OUT = Path('output/video/assets')
OUT.mkdir(parents=True, exist_ok=True)
regular = 'C:/Windows/Fonts/segoeui.ttf'
bold = 'C:/Windows/Fonts/segoeuib.ttf'
cards = [
    ('opening', 'META CONVERSATION CO-HOST', 'Help the conversation.\nThen step back.',
     'An AI research producer for real conversations.'),
    ('disclosure', 'ABOUT THIS DEMONSTRATION', 'Synthetic speakers.\nActual Meta responses.',
     'Real application recording · No physical microphone · Not a human trial'),
    ('research', 'RESEARCH PD', 'Listen. Look it up.\nReturn the floor.',
     'Explicit request → source lookup → relevance review → spoken answer'),
    ('control', 'HUMAN CONTROL', 'The co-host can wait.\nThe operator can stop it.',
     'Separate recorded run · Automated operator sends manual HOLD'),
    ('architecture', 'BUILT ON AN EXISTING STUDIO', 'Meta makes the decisions.',
     'Meta: transcription, decisions, research, relevance review\nOpenAI: speech synthesis   /   LiveKit: audio transport\nReact + Vite + Node + Express · Local audio and evidence'),
    ('closing', 'WORKING MVP', 'Help the conversation.\nThen step back.',
     'Response times vary. Review sources. Human testing remains ahead.'),
]
for name, eyebrow, headline, detail in cards:
    im = Image.new('RGB', (1920, 1080), '#0b1019')
    d = ImageDraw.Draw(im)
    d.rectangle((120, 140, 200, 147), fill='#a8e7dc')
    d.text((120, 182), eyebrow, font=ImageFont.truetype(bold, 28), fill='#a8e7dc')
    d.multiline_text((120, 285), headline, font=ImageFont.truetype(bold, 82), fill='#edf4ff', spacing=20)
    d.multiline_text((120, 620), detail, font=ImageFont.truetype(regular, 33), fill='#becbdc', spacing=18)
    d.line((120, 900, 1800, 900), fill='#344153', width=2)
    d.text((120, 930), 'META GLOBAL AI DEVELOPER HACKATHON 2026', font=ImageFont.truetype(regular, 22), fill='#8fa4bb')
    im.save(OUT / f'card-{name}.png')
print(f'Created {len(cards)} editorial cards in {OUT}')
