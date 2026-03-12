import express, { Router } from 'express'
import type { Provider } from 'oidc-provider'

import { loginPage, consentPage } from './views.js'

export function createInteractionRouter(provider: Provider): Router {
  const router = Router()
  router.use(express.urlencoded({ extended: false }))

  router.get('/:uid', async (req, res, next) => {
    try {
      const interaction = await provider.interactionDetails(req, res)
      const { prompt, params } = interaction

      if (prompt.name === 'login') {
        res.send(loginPage(interaction.uid))
      } else if (prompt.name === 'consent') {
        const missingScopes = (prompt.details.missingOIDCScope as string[] | undefined) ?? []
        res.send(consentPage(interaction.uid, String(params.client_id), missingScopes))
      } else {
        next(new Error(`Unknown prompt: ${prompt.name}`))
      }
    } catch (err) {
      next(err)
    }
  })

  router.post('/:uid/login', async (req, res, next) => {
    try {
      const accountId = (req.body.login as string) || 'stub-user'
      await provider.interactionFinished(
        req,
        res,
        { login: { accountId } },
        { mergeWithLastSubmission: false },
      )
    } catch (err) {
      next(err)
    }
  })

  router.post('/:uid/confirm', async (req, res, next) => {
    try {
      const {
        grantId,
        session,
        params,
        prompt: { details },
      } = await provider.interactionDetails(req, res)

      const grant =
        grantId != null
          ? await provider.Grant.find(grantId)
          : new provider.Grant({
              accountId: session!.accountId,
              clientId: String(params.client_id),
            })

      if (details.missingOIDCScope) {
        grant!.addOIDCScope((details.missingOIDCScope as string[]).join(' '))
      }
      if (details.missingOIDCClaims) {
        grant!.addOIDCClaims(details.missingOIDCClaims as string[])
      }

      const savedGrantId = await grant!.save()
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
