import bodyParser from 'body-parser';
import { Router } from 'express';

import { Models } from '../../../common/models';
import { ensureLoggedIn } from '../config/auth-helpers';
import { lunaSec } from '../config/configure-lunasec';

export function userRouter(models: Models) {
  const router = Router();

  router.use(bodyParser.json());

  /* GET users listing. */
  router.get('/me', ensureLoggedIn, async (req, res) => {
    const user = req.user;
    if (user.ssn_token) {
      await lunaSec.grants.create(req.session.id, user.ssn_token);
    }
    res.json({
      success: true,
      user,
    });
  });

  router.post('/set-ssn', ensureLoggedIn, async (req, res) => {
    if (!req.user) {
      return res.json({
        success: false,
        error: 'User not logged in',
      });
    }
    try {
      await lunaSec.grants.verify(req.session.id, req.body.ssn_token);
      await models.user.setSsn(req.user.id, req.body.ssn_token);
    } catch (e: any) {
      console.error(e);
      return res.json({
        success: false,
        error: e.toString(),
      });
    }

    return res.json({
      success: true,
    });
  });

  return router;
}
