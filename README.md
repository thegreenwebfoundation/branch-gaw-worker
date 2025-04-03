# Grid-aware Worker

This repository contains the code for a Cloudflare Worker that is applied to the <https://https://branch-staging.climateaction.tech/> website. It is a demonstration implementation of the [Grid-aware Websites](https://github.com/thegreenwebfoundation/grid-aware-websites) project.

## Guide

The Branch website already implements a carbon-aware design, that is based on code run in a user's browser when they visit the website. This code makes several design changes to the site, which are outlined in the article [_"Designing Branch: Sustainable Interaction Design Principles"_](https://branch.climateaction.tech/issues/issue-1/designing-branch-sustainable-interaction-design-principles/). This Cloudflare Worker removes the client-side carbon aware code, and implements grid-aware design changes to the website run at the edge.

The code on this website is only applied to the Branch staging website at the moment. The public Branch website currently implements the previous client-side carbon aware code.

## Development

_Note: A valid [Electricity Maps API key](https://www.electricitymaps.com/pricing) is required for this project._

To make changes to this Worker, and deploy it:

1. Fork this repository, and clone it to your development environment.
2. In your terminal, navigate to the folder that the project is cloned into.
3. Run `npm install` to install all the project dependencies.

## Deploying to production

When you're ready, you can deploy your worker to run on your website for the actual path you've configured. Run `npx wrangler deploy` in your terminal to deploy your Worker to production.
