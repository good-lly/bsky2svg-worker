# 🦋 bsky2svg-worker

#### Super simple Cloudflare Worker to generate SVG images from your posts on Bluesky and publish on your Github profile like this:

<a href="https://bsky.app/profile/peter-in-the.bsky.social" target="_blank" rel="noopener noreferrer">
  <img src="https://bsky2svg-worker.jensenwtfwtf.workers.dev/render.svg?sanitize=true" alt="example image of bsky to svg" width="100%"/>
</a>

## How to use the bsky2svg worker

1. Clone the repository:

```bash
git clone <repository-url>
cd bsky2svg-worker
```

2. Install the dependencies:

```bash
npm install
```

3. Replace username in `src/index.js` with your own username:

```javascript
const USERNAME = 'your-username'; // change this to your username!
```

4. Change the project name in `wrangler.toml` to your own project name:

```toml
name = "bsky2svg-worker" // change this to your project name!
```

5. If you are logged in to Cloudflare via wrangler you can deploy the worker with:

```bash
npm run deploy
```

Otherwise, you can log in to Cloudflare with:

```bash
npx wrangler login
```

Then deploy the worker with:

```bash
npm run deploy
```

6. After deploying, you will get a URL for your worker. You can use this URL to access the worker with url `/render.svg`.
   Like this: `https://[YOUR_PROJECT_NAME].workers.dev/render.svg`

That's it! You can now use the bsky2svg worker to generate SVG images from your posts on Bluesky.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

## Contributing

Contributions are welcome! If you have any suggestions or improvements, please open an issue or a pull request.

## 💙 Sponsor these shenanigans

Help keep the nonsense rolling by becoming a sponsor otherwise Cloudflare will ruin my bills!

[![Become a Sponsor](https://img.shields.io/badge/💸_GitHub-Sponsor-ff69b4?logo=github&logoColor=white)](https://github.com/sponsors/good-lly)
