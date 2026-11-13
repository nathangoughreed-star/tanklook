# usage: run.sh <tag>
node scripts/vf-shots.mjs --scenes research/screens/BD2/${2:-scene.json} --fx none --no-numbers --views "at:745/10/210/7/0/8,at:745/10/210/7/45/12" --dir research/screens/BD2/$1
