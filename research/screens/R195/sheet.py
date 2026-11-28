# R195 review sheet: per subject, the approved card (drawn from reference photos) | render now | render with fx hue, hue numbers in the titles
from PIL import Image, ImageDraw, ImageFont
D='research/screens/R195/'
B=Image.open(D+'close/before.png').convert('RGB'); A=Image.open(D+'close/after.png').convert('RGB')
rows=[('Flame angel','flameangelb',(95,165,345,410),'12','358','6'),
      ('Platy (red)','platyb',(395,205,480,365),'25','11','21'),
      ('Harlequin rasbora','harlequinb',(600,200,720,360),'22','35','36'),
      ('Red plants: lotus, ludwigia','',(170,400,760,676),'-','lotus 6 / ludwigia 46','lotus 11 / ludwigia 45')]
H=300; W=1500
f=ImageFont.truetype('arial.ttf',22); g=ImageFont.truetype('arial.ttf',18)
sheet=Image.new('RGB',(W,60+len(rows)*(H+40)),(250,250,248)); d=ImageDraw.Draw(sheet)
d.text((10,10),'R195 hue keep, hue-close scene (VF2-A, build 3041): card | NOW (ACES, shipped) | WITH FIX (fx hue). Hue in degrees.',font=f,fill=(0,0,0))
y=50
for name,look,box,hc,hb,ha in rows:
  d.text((10,y),name,font=f,fill=(0,0,0)); y+=30; x=10
  cols=[]
  if look:
    c=Image.open(f'public/art/fish/{look}.webp').convert('RGBA'); bg=Image.new('RGBA',c.size,(40,40,40,255)); bg.alpha_composite(c); cols.append((f'card  hue {hc}',bg.convert('RGB')))
  cols+= [(f'NOW  hue {hb}',B.crop(box)),(f'WITH FIX  hue {ha}',A.crop(box))]
  for lab,im in cols:
    s=min((H-24)/im.height,470/im.width); im=im.resize((int(im.width*s),int(im.height*s)),Image.LANCZOS)
    sheet.paste(im,(x,y+24)); d.text((x,y),lab,font=g,fill=(180,0,0) if 'FIX' in lab else (0,0,0)); x+=im.width+20
  y+=H+10
sheet.save(D+'R195-sheet.png'); print(sheet.size)
