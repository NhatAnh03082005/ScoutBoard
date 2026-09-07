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

**ScoutBoard Backend API Service** — Modular Monolith + Clean Architecture implemented in [NestJS](https://github.com/nestjs/nest) & TypeScript, backed by PostgreSQL 17 and TypeORM 0.3.

### Data Contract & API-Football Audit (Post-Cleanup)
- **Supported Raw Attributes**: Player profile biometrics (`height_cm`, `weight_kg`), club details, player season/match statistics (shots, passes, tackles, duels, fouls, saves, cards).
- **Normalized Technical Fields**:
  - `height_cm`: Converted from raw string `"183 cm"` to integer `183`.
  - `weight_kg`: Converted from raw string `"72 kg"` to integer `72`.
  - `primary_position`: Canonical player positions (15 specific positions: `GK`, `CB`, `LB`, `RB`, `LWB`, `RWB`, `CDM`, `CM`, `CAM`, `LM`, `RM`, `LW`, `RW`, `CF`, `ST`, plus 3 broad category fallbacks: `DEF`, `MID`, `FWD` in `CANONICAL_PLAYER_POSITIONS`, total 18 codes).
- **ScoutBoard-Derived Metrics** (Explicitly calculated by ScoutBoard domain layer, not raw provider fields):
  - **Per-90 metrics**: `(stat * 90) / minutes_played` (calculated for `goals_per_90`, `assists_per_90`, `shots_per_90`, `passes_per_90`, `tackles_per_90`, `interceptions_per_90`, `duels_won_per_90`, `saves_per_90`, `goals_conceded_per_90` strictly when `minutes_played > 0`).
  - **passAccuracy**: `(passes_completed / passes_attempted) * 100` (rounded to 2 decimal places; returns `null` when `passes_attempted <= 0`).
  - **savePercentage**: `(saves / (saves + goals_conceded)) * 100` (rounded to 2 decimal places; returns `null` when total shots faced is 0).
  - **age**: Exact integer age derived from `date_of_birth` relative to current date (accounting for month and day).
  - **nationalityFlagUrl**: ISO-3166 & FIFA country code mapping to SVG flag CDN.
- **ScoutBoard Domain Concepts**: Position Groups (`GOALKEEPER`, `DEFENDER`, `MIDFIELDER`, `FORWARD`), 4-Zone modular architecture, Squad Builder tactics, Candidate Comparison matrix.
- **Unsupported Attributes Removed**: `preferred_foot` (dropped from DB via migration `1789700000000-DropPreferredFootFromPlayers.ts`), `market_value`, `contract_expiry`, `xG`, `xA`, `PSxG`, `distance_covered`, `top_speed`, `heatmap` coordinates.

## Project setup

```bash
$ npm install
```

## Compile and run the project

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```

## Run tests

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```

## Deployment

When you're ready to deploy your NestJS application to production, there are some key steps you can take to ensure it runs as efficiently as possible. Check out the [deployment documentation](https://docs.nestjs.com/deployment) for more information.

If you are looking for a cloud-based platform to deploy your NestJS application, check out [Mau](https://mau.nestjs.com), our official platform for deploying NestJS applications on AWS. Mau makes deployment straightforward and fast, requiring just a few simple steps:

```bash
$ npm install -g @nestjs/mau
$ mau deploy
```

With Mau, you can deploy your application in just a few clicks, allowing you to focus on building features rather than managing infrastructure.

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
