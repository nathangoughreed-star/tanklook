# R195: hue of each subject, card vs render before/after (median of saturated pixels in a box). python research/screens/R195/measure.py
import numpy as np, colorsys, sys
from PIL import Image
D='research/screens/R195/close/'
def hs(px):
  px=px.reshape(-1,px.shape[-1])[:,:3].astype(float)/255
  hsv=np.array([colorsys.rgb_to_hsv(*p) for p in px])
  m=(hsv[:,1]>0.4)&(hsv[:,2]>0.25); px=px[m]; hsv=hsv[m]
  if not len(px): return None
  ang=np.angle(np.mean(np.exp(2j*np.pi*hsv[:,0])))/(2*np.pi)*360%360
  return tuple((np.median(px,0)*255).astype(int)), round(ang), round(float(np.median(hsv[:,1])),2), len(px)
def card(look):
  im=np.array(Image.open(f'public/art/fish/{look}.webp').convert('RGBA')); a=im[...,3]>200; return hs(im[a][:,:3])
boxes={'flame angel':(170,170,310,260),'platy':(405,215,470,245),'harlequin':(625,214,665,236),'red plant (lotus)':(570,430,740,620),'red stem (ludwigia)':(190,420,250,640),'green sword':(560,240,700,380)}
cards={'flame angel':'flameangelb','platy':'platyb','harlequin':'harlequinb'}
for n,b in boxes.items():
  r=[hs(np.array(Image.open(D+f).convert('RGB').crop(b))) for f in ('before.png','after.png')]
  c=card(cards[n]) if n in cards else None
  f=lambda x: f'{x[0]} hue {x[1]:3d} S {x[2]}' if x else '-'
  print(f'{n:20s} card {f(c):34s} | before {f(r[0]):34s} | after {f(r[1])}')
