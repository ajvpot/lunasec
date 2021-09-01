import { SecureForm, SecureInput } from '@lunasec/react-sdk';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  FormGroup,
  FormLabel,
  Grid,
  makeStyles,
  TextField,
  Typography,
} from '@material-ui/core';
import axios from 'axios';
import React, { useEffect, useState } from 'react';

import { ApiResponse, CurrentUserResponse, UserModel } from '../types';

const useStyles = makeStyles((theme) => ({
  margin: {
    margin: theme.spacing() * 2,
  },
  padding: {
    padding: theme.spacing(),
  },
}));

async function loadUser(setUser: React.Dispatch<any>, setError: React.Dispatch<React.SetStateAction<string | null>>) {
  const { data } = await axios.get<CurrentUserResponse>(`/user/me`);
  if (data.success) {
    setUser(data.user);
    return;
  }
  setError(data.error);
}

export const SecureInputDemo: React.FunctionComponent = () => {
  const classes = useStyles({});

  const [saveSuccessful, setSaveSuccessful] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<UserModel | null>(null);
  const [ssnToken, setSsnToken] = useState<string | null>(null);
  const [ssnValid, setSsnValid] = useState<boolean>(true);

  useEffect(() => {
    void loadUser(setUser, setError); // does this only once
  }, []);

  const uploadFormData = async () => {
    console.log('uploadformdata called');
    if (ssnToken === null) {
      setError('ssnToken is null');
      return;
    }
    console.log('about to send axios request');
    const { data } = await axios.post<ApiResponse>(`/user/me`, {
      ssnToken: ssnToken,
    });
    console.log('axios responded');
    if (!data.success) {
      console.error('saving form data error ', data.error);
      setError(JSON.stringify(data.error));
      return;
    }
    console.log('success saving form');
    setSaveSuccessful(true);
  };

  const handleFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (ssnValid) {
      void uploadFormData();
    }
  };

  const displaySavedResult = () => {
    if (saveSuccessful) {
      return <p color="green">Saved</p>;
    }
    if (saveSuccessful === false) {
      return <p color="red">Failed to Save</p>;
    }
    return null;
  };

  if (!user) {
    return (
      <Grid item xs={12}>
        <Card>
          <CardContent>
            <p>Loading...</p>
          </CardContent>
        </Card>
      </Grid>
    );
  }

  // These props are predefined like this to preserve the strong typing.
  // We are being fancy here and passing these into MaterialUi,
  // but if you want to use SecureInput directly just pass these directly into it
  const secureInputProps: React.ComponentProps<typeof SecureInput> = {
    id: 'ssn-token-input',
    name: 'ssn',
    type: 'ssn',
    validator: 'SSN',
    onValidate: (isValid: boolean) => setSsnValid(isValid),
    token: user.ssn_token || undefined,
    placeholder: 'XXX-XX-XXXX',
    onChange: (e) => setSsnToken(e.target.value),
    errorHandler: (e) => setError(e.message),
  };

  return (
    <Grid item xs={12}>
      {error !== null ? (
        <Card>
          <CardHeader title={'Error'} />
          <CardContent>
            <p>{error}</p>
          </CardContent>
        </Card>
      ) : null}
      <Card>
        <CardHeader title={`User: ${user.username}`} />
        {displaySavedResult()}
        <CardContent>
          <SecureForm name="secure-form-example" onSubmit={(e) => handleFormSubmit(e)}>
            <FormGroup className={classes.margin}>
              <Typography>Id: {user.id}</Typography>
            </FormGroup>
            <FormGroup className={classes.margin}>
              <FormLabel htmlFor="ssn-token-input">Social Security Number</FormLabel>
              {/* Here we are using Material with the LunaSec Secure Input instead of using SecureInput directly.  Experimental */}
              <TextField
                error={!ssnValid}
                helperText={ssnValid ? '' : 'Invalid Format'}
                variant="outlined"
                InputProps={{
                  /*
                  // @ts-ignore */
                  inputComponent: SecureInput,
                  inputProps: secureInputProps,
                }}
              ></TextField>
            </FormGroup>
            <div className={classes.margin}>
              <Button variant="outlined" color="primary" style={{ textTransform: 'none' }} type="submit">
                Save
              </Button>
            </div>
          </SecureForm>
        </CardContent>
      </Card>
    </Grid>
  );
};
