<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

[circleci-image]: https://img.shields.io/circleci/build/github/nestjs/nest/master?token=abc123def456
[circleci-url]: https://circleci.com/gh/nestjs/nest

  <p align="center">A progressive <a href="http://nodejs.org" target="_blank">Node.js</a> framework for building efficient and scalable server-side applications.</p>
    <p align="center">
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/v/@nestjs/core.svg" alt="NPM Version" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/l/@nestjs/core.svg" alt="Package License" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/dm/@nestjs/common.svg" alt="NPM Downloads" /></a>
<a href="https://circleci.com/gh/nestjs/nest" target="_blank"><img src="https://img.shields.io/circleci/build/github/nestjs/nest/master" alt="CircleCI" /></a>
<a href="https://discord.gg/G7Qnnhy" target="_blank"><img src="https://img.shields.io/badge/discord-online-brightgreen.svg" alt="Discord"/></a>
<a href="https://opencollective.com/nest#backer" target="_blank"><img src="https://opencollective.com/nest/backers/badge.svg" alt="Backers on Open Collective" /></a>
<a href="https://opencollective.com/nest#sponsor" target="_blank"><img src="https://opencollective.com/nest/sponsors/badge.svg" alt="Sponsors on Open Collective" /></a>
  <a href="https://paypal.me/kamilmysliwiec" target="_blank"><img src="https://img.shields.io/badge/Donate-PayPal-ff3f59.svg" alt="Donate us"/></a>
    <a href="https://opencollective.com/nest#sponsor"  target="_blank"><img src="https://img.shields.io/badge/Support%20us-Open%20Collective-41B883.svg" alt="Support us"></a>
  <a href="https://twitter.com/nestframework" target="_blank"><img src="https://img.shields.io/twitter/follow/nestframework.svg?style=social&label=Follow" alt="Follow us on Twitter"></a>
</p>
  <!--[![Backers on Open Collective](https://opencollective.com/nest/backers/badge.svg)](https://opencollective.com/nest#backer)
  [![Sponsors on Open Collective](https://opencollective.com/nest/sponsors/badge.svg)](https://opencollective.com/nest#sponsor)-->

## Description

[Nest](https://github.com/nestjs/nest) framework TypeScript starter repository.

## Project setup

```bash
$ pnpm install
```

## Compile and run the project

```bash
# development
$ pnpm run start

# watch mode
$ pnpm run start:dev

# production mode
$ pnpm run start:prod
```

## Run tests

```bash
# unit tests
$ pnpm run test

# e2e tests
$ pnpm run test:e2e

# test coverage
$ pnpm run test:cov
```

## Deployment

When you're ready to deploy your NestJS application to production, there are some key steps you can take to ensure it runs as efficiently as possible. Check out the [deployment documentation](https://docs.nestjs.com/deployment) for more information.

If you are looking for a cloud-based platform to deploy your NestJS application, check out [Mau](https://mau.nestjs.com), our official platform for deploying NestJS applications on AWS. Mau makes deployment straightforward and fast, requiring just a few simple steps:

```bash
$ pnpm install -g mau
$ mau deploy
```

With Mau, you can deploy your application in just a few clicks, allowing you to focus on building features rather than managing infrastructure.

## Facebook client

[`src/facebook.client.ts`](src/facebook.client.ts) reads Penelco's power interruption posts straight
from the Facebook web app. Facebook's Graph API does not expose page photos without a page access
token, so the client calls the same endpoints the website uses and parses the Relay payloads that
Facebook embeds in the server rendered HTML:

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `getLatestPosts()` | `GET /{page}/photos` | Newest photos of the page. Each item exposes a ~206px `thumbnailUrl` plus the ~1440px `imageUrl` already present in the grid payload. |
| `getPostDetail(id)` | `GET /photo.php?fbid={id}` | Full photo payload, including the high resolution `imageUrl`, caption, creation time and owning post. |
| `downloadImage(url)` | `GET {scontent URL}` | Downloads the image bytes. CDN URLs are signed but still require the session cookie. |

### Cookie

Both HTML endpoints and the CDN require a logged in session. Copy the `Cookie` request header from a
logged in browser (DevTools → Network → any `facebook.com` request → Request Headers), or pass the
individual values. Keep it out of source control; `.env` is already gitignored.

```ts
import { FacebookClient } from "./facebook.client";

const client = new FacebookClient({
	cookie: process.env.FACEBOOK_COOKIE!, // "c_user=...; xs=...; datr=...; sb=..."
	page: "penelco", // optional, defaults to "penelco"
});

const posts = await client.getLatestPosts({ limit: 5 });
const detail = await client.getPostDetail(posts[0].id);

const { buffer, contentType } = await client.downloadImage(detail.imageUrl);
```

`getPostDetail` also accepts a photo id or any photo URL containing an `fbid`, so `posts[0].url`
works directly.

Failures surface as `FacebookError` with a `code` of `AUTH_REQUIRED` (missing or expired cookie),
`RATE_LIMITED`, `NOT_FOUND`, `HTTP_ERROR`, `PARSE_ERROR` (Facebook changed its markup) or
`NETWORK_ERROR`.

### Caveats

- These are internal web endpoints, not a public API. Facebook can change the payload shape at any
  time; `PARSE_ERROR` is the signal that the extractors need updating.
- Only the first grid batch (~8 photos) is available. Paging the collection needs Facebook's Relay
  GraphQL pagination, which requires the page's `fb_dtsg` token and a `doc_id` that rotates with
  Facebook deploys.
- Images are served at ~1440px. Requesting a larger `ctp` variant returns HTTP 400.

## Interruption extraction

The mobile API (`/webapp/app_posts_manager/fetch_posts.php`) returns each post's posters as **bare
base64** in `images[]` — no data URI prefix, JPEG and PNG mixed. The `content` field is often empty,
and when it is filled it is prose, so the structured details (date, times, affected areas) only exist
in the image.

[`src/interruption-extractor.ts`](src/interruption-extractor.ts) reads those images with any OpenAI
compatible chat completions endpoint.

### Configuration

Copy [`.env.example`](.env.example) to `.env` and set:

| Variable | Purpose |
| --- | --- |
| `AI_BASE_URL` | Endpoint root, e.g. `https://api.openai.com/v1` or `http://localhost:11434/v1` |
| `AI_API_KEY` | Bearer token. Leave empty to disable extraction |
| `AI_MODEL` | A vision capable model, e.g. `gpt-4o-mini`, `llava` |
| `AI_IMAGE_DETAIL` | `low`, `high` or `auto`. Defaults to `high` |

### Usage

```ts
import { InterruptionExtractor } from "./interruption-extractor";

const extractor = new InterruptionExtractor({
	baseUrl: process.env.AI_BASE_URL,
	apiKey: process.env.AI_API_KEY,
	model: process.env.AI_MODEL,
});

const result = await extractor.extract(post.images, {
	content: post.content, // optional caption, used as extra context
	postedAt: post.time_stamp,
});
```

All images of a post are sent in **one** request, because a notice is often a multi image carousel.
Images are converted to `data:<mime>;base64,...` with the mime type sniffed from the base64 prefix.

The result carries `isPowerInterruption`, `noticeType`, `date` (`YYYY-MM-DD`), `timeSlots` and
`formerTimeSlots` (24 hour `HH:mm`, keeping the printed `NEW TIME` / `FORMERLY` labels),
`municipalities`, `areas`, `reason`, `restorationTime`, verbatim `rawText` and a self reported
`confidence`.

### Provider compatibility

Extraction goes through the official [`openai`](https://www.npmjs.com/package/openai) SDK, so any
OpenAI compatible endpoint works by setting `AI_BASE_URL`. The JSON Schema is generated from a
[`zod`](https://zod.dev) schema with `zodResponseFormat`, and the same schema validates the reply.

Providers differ in how strictly they honour `response_format`. The SDK does **not** fall back on its
own, so the extractor starts with `json_schema` (strict) and, on a `400`/`422`, retries with
`json_object`, then with no response format at all. The working mode is remembered, so later calls go
straight to it. Markdown fenced replies are also tolerated.

Transient failures are retried by the SDK (`maxRetries`, default 2). Pass `maxRetries: 0` in tests to
keep failures deterministic.

### Endpoints

| Route | Description |
| --- | --- |
| `GET /` | Raw posts exactly as the mobile API returns them |
| `GET /interruptions` | Interruption posts with `extraction` filled in |
| `GET /interruptions/:id` | A single post by its `id` |

A failed extraction does not abort the batch: the post is returned with `extraction: null` and an
`extractionError` message.

### Cost

A typical notice poster is 1440x1440, which is about **4 tiles / ~765 tokens** at `detail: high`, plus
roughly 400 output tokens. A 4 image carousel is therefore around 3k input tokens per post. Lower
`AI_IMAGE_DETAIL` to `low` to cut that to ~85 tokens per image, at the cost of small print.

## Resources

Check out a few resources that may come in handy when working with NestJS:

- Visit the [NestJS Documentation](https://docs.nestjs.com) to learn more about the framework.
- For questions and support, please visit our [Discord channel](https://discord.gg/G7Qnnhy).
- To dive deeper and get more hands-on experience, check out our official video [courses](https://courses.nestjs.com/).
- Deploy your application to AWS with the help of [NestJS Mau](https://mau.nestjs.com) in just a few clicks.
- Visualize your application graph and interact with the NestJS application in real-time using [NestJS Devtools](https://devtools.nestjs.com).
- Need help with your project (part-time to full-time)? Check out our official [enterprise support](https://enterprise.nestjs.com).
- To stay in the loop and get updates, follow us on [X](https://x.com/nestframework) and [LinkedIn](https://linkedin.com/company/nestjs).
- Looking for a job, or have a job to offer? Check out our official [Jobs board](https://jobs.nestjs.com).

## Support

Nest is an MIT-licensed open source project. It can grow thanks to the sponsors and support by the amazing backers. If you'd like to join them, please [read more here](https://docs.nestjs.com/support).

## Stay in touch

- Author - [Kamil Myśliwiec](https://twitter.com/kammysliwiec)
- Website - [https://nestjs.com](https://nestjs.com/)
- Twitter - [@nestframework](https://twitter.com/nestframework)

## License

Nest is [MIT licensed](https://github.com/nestjs/nest/blob/master/LICENSE).
