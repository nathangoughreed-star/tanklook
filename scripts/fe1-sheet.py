# Strips of the fin 0 / 50 / 100 pictures per species -> research/screens/FE1/
from PIL import Image
for sp in ['bristlenose', 'betta', 'angel', 'bluetang', 'discus']:
    ims = [Image.open(f'shots/fe1_{sp}_fin{n}.png').convert('RGB') for n in (0, 50, 100)]
    c = Image.new('RGB', (sum(i.width for i in ims) + 20, max(i.height for i in ims)), 'white'); x = 0
    for i in ims: c.paste(i, (x, 0)); x += i.width + 10
    c.save(f'research/screens/FE1/fe1_{sp}_fin0-50-100.png')
