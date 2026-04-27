import express, { Router, Request, Response, NextFunction } from 'express'
import type { Provider, Interaction, Grant } from 'oidc-provider'

import type { DefaultUser } from './provider.js'
import { loginPage, consentPage } from './views/index.js'

export interface InteractionRouterOptions {
  skipPrompt?: boolean
  defaultUser?: DefaultUser
}

async function autoCompleteInteraction(
  provider: Provider,
  defaultUser: DefaultUser | undefined,
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const details: Interaction = await provider.interactionDetails(req, res)
  const { prompt, params, grantId } = details

  if (prompt.name === 'login') {
    await provider.interactionFinished(
      req,
      res,
      { login: { accountId: defaultUser?.sub ?? 'stub-user' } },
      { mergeWithLastSubmission: false },
    )
    return
  }

  if (prompt.name === 'consent') {
    const Grant = provider.Grant
    const session = details.session

    let grant: Grant | undefined
    if (grantId) {
      grant = await Grant.find(grantId)
    }
    if (!grant) {
      grant = new Grant({
        accountId: session?.accountId,
        clientId: params.client_id as string,
      })
    }

    const { missingOIDCScope, missingOIDCClaims, missingResourceScopes } = prompt.details
    if (missingOIDCScope) {
      grant.addOIDCScope((missingOIDCScope as string[]).join(' '))
    }
    if (missingOIDCClaims) {
      grant.addOIDCClaims(missingOIDCClaims as string[])
    }
    if (missingResourceScopes) {
      for (const [indicator, scopes] of Object.entries(missingResourceScopes)) {
        grant.addResourceScope(indicator, (scopes as string[]).join(' '))
      }
    }

    const savedGrantId = await grant.save()
    await provider.interactionFinished(
      req,
      res,
      { consent: { grantId: savedGrantId } },
      { mergeWithLastSubmission: true },
    )
    return
  }

  next(new Error(`Unsupported prompt: ${prompt.name}`))
}

export function createInteractionRouter(provider: Provider, options: InteractionRouterOptions = {}): Router {
  const router = Router()

  router.use((_req, res, next) => {
    res.setHeader('Cache-Control', 'no-store')
    res.setHeader('Pragma', 'no-cache')
    next()
  })
  router.use(express.urlencoded({ extended: false }))

  router.get('/:uid/auto', async (req, res, next) => {
    try {
      await autoCompleteInteraction(provider, options.defaultUser, req, res, next)
    } catch (err) {
      next(err)
    }
  })

  router.get('/:uid', async (req, res, next) => {
    try {
      if (options.skipPrompt) {
        await autoCompleteInteraction(provider, options.defaultUser, req, res, next)
        return
      }

      const details: Interaction = await provider.interactionDetails(req, res)
      const { prompt, params } = details
      const clientId = String(params.client_id ?? 'unknown')

      switch (prompt.name) {
        case 'login':
          res.type('html').send(loginPage({ uid: req.params.uid, clientId }))
          break
        case 'consent': {
          const missingScopes = (prompt.details.missingOIDCScope as string[] | undefined) ?? []
          res.type('html').send(consentPage({ uid: req.params.uid, clientId, scopes: missingScopes }))
          break
        }
        default:
          next(new Error(`Unsupported prompt: ${prompt.name}`))
      }
    } catch (err) {
      next(err)
    }
  })

  router.post('/:uid/login', async (req, res, next) => {
    try {
      const { username } = req.body as { username?: string }
      await provider.interactionFinished(
        req,
        res,
        { login: { accountId: username?.trim() || 'stub-user' } },
        { mergeWithLastSubmission: false },
      )
    } catch (err) {
      next(err)
    }
  })

  router.post('/:uid/confirm', async (req, res, next) => {
    try {
      const details: Interaction = await provider.interactionDetails(req, res)
      const {
        prompt: { details: promptDetails },
        params,
        grantId,
      } = details

      const Grant = provider.Grant
      const session = details.session

      let grant: Grant | undefined
      if (grantId) {
        grant = await Grant.find(grantId)
      }
      if (!grant) {
        grant = new Grant({
          accountId: session?.accountId,
          clientId: params.client_id as string,
        })
      }

      if (promptDetails.missingOIDCScope) {
        grant.addOIDCScope((promptDetails.missingOIDCScope as string[]).join(' '))
      }
      if (promptDetails.missingOIDCClaims) {
        grant.addOIDCClaims(promptDetails.missingOIDCClaims as string[])
      }
      if (promptDetails.missingResourceScopes) {
        for (const [indicator, scopes] of Object.entries(promptDetails.missingResourceScopes)) {
          grant.addResourceScope(indicator, (scopes as string[]).join(' '))
        }
      }

      const savedGrantId = await grant.save()
      await provider.interactionFinished(
        req,
        res,
        { consent: { grantId: savedGrantId } },
        { mergeWithLastSubmission: true },
      )
    } catch (err) {
      next(err)
    }
  })

  router.post('/:uid/abort', async (req, res, next) => {
    try {
      await provider.interactionFinished(
        req,
        res,
        { error: 'access_denied', error_description: 'End-User aborted interaction' },
        { mergeWithLastSubmission: false },
      )
    } catch (err) {
      next(err)
    }
  })

  return router
}
