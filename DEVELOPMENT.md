# Development

## Icons

To bulk resize icons

```bash
cd icons
for size in 16 32 48 64; do ffmpeg -i icon.png -vf scale=${size}:${size} icon${size}.png; done

```
