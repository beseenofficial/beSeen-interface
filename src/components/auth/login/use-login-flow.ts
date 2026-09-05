'use client';

import {
  useLoginEmail,
  useLoginOAuth,
  useLoginPasskey,
  useLoginWallet,
} from '@bluxcc/react';
import { useEffect, useState, type FormEvent } from 'react';
import { useAuth } from '@/lib/blux';

export type LoginMethod =
  | 'wallet'
  | 'google'
  | 'email'
  | 'discord'
  | 'github'
  | 'passkey';

function emailValidationMessage(value: string) {
  const normalized = value.trim();
  if (!normalized) return 'Enter your email address.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
    return 'Enter a complete email address, such as name@example.com.';
  }
  return null;
}

export function useLoginFlow() {
  const auth = useAuth();
  const emailLogin = useLoginEmail();
  const oauthLogin = useLoginOAuth();
  const passkeyLogin = useLoginPasskey();
  const walletLogin = useLoginWallet();
  const [signatureWorking, setSignatureWorking] = useState(false);
  const [activeMethod, setActiveMethod] = useState<LoginMethod | null>(null);
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [emailValidationError, setEmailValidationError] = useState<string | null>(null);
  const [codeNotice, setCodeNotice] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);

  const methodPending =
    emailLogin.isPending ||
    oauthLogin.isPending ||
    passkeyLogin.isPending ||
    walletLogin.isPending;

  useEffect(() => {
    if (emailLogin.isCodeSent) {
      document.getElementById('login-code')?.focus();
    }
  }, [emailLogin.isCodeSent]);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = window.setTimeout(
      () => setResendCooldown((seconds) => Math.max(0, seconds - 1)),
      1000,
    );
    return () => window.clearTimeout(timer);
  }, [resendCooldown]);

  async function continueWithSignature() {
    setSignatureWorking(true);
    try {
      await auth.completeSignIn();
    } catch {
      // Provider errors are intentionally not rendered in the login panel.
    } finally {
      setSignatureWorking(false);
    }
  }

  async function loginWithOAuth(provider: 'google' | 'discord' | 'github') {
    setActiveMethod(provider);
    oauthLogin.reset();
    try {
      await oauthLogin.loginOAuthAsync(provider);
    } catch {
      // Provider errors are intentionally not rendered in the login panel.
    } finally {
      setActiveMethod(null);
    }
  }

  async function loginWithWallet() {
    setActiveMethod('wallet');
    walletLogin.reset();
    try {
      await walletLogin.loginWalletAsync();
    } catch {
      // Provider errors are intentionally not rendered in the login panel.
    } finally {
      setActiveMethod(null);
    }
  }

  async function loginWithPasskey() {
    setActiveMethod('passkey');
    passkeyLogin.reset();
    try {
      await passkeyLogin.loginPasskeyAsync();
    } catch {
      // Provider errors are intentionally not rendered in the login panel.
    } finally {
      setActiveMethod(null);
    }
  }

  async function sendEmailCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const validationMessage = emailValidationMessage(email);
    setEmailValidationError(validationMessage);
    if (validationMessage) return;

    setActiveMethod('email');
    setCodeNotice(null);
    try {
      await emailLogin.sendCodeAsync(email.trim());
      setResendCooldown(30);
    } catch {
      // Transport errors are intentionally not rendered in the login panel.
    } finally {
      setActiveMethod(null);
    }
  }

  async function verifyEmailCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setActiveMethod('email');
    setCodeNotice(null);
    try {
      await emailLogin.loginWithCodeAsync(email.trim(), code.trim());
    } catch {
      // Transport errors are intentionally not rendered in the login panel.
    } finally {
      setActiveMethod(null);
    }
  }

  async function resendEmailCode() {
    setActiveMethod('email');
    setCodeNotice(null);
    try {
      await emailLogin.sendCodeAsync(email.trim());
      setCodeNotice('A new code was sent. Check your inbox.');
      setResendCooldown(30);
    } catch {
      // Transport errors are intentionally not rendered in the login panel.
    } finally {
      setActiveMethod(null);
    }
  }

  function resetEmailLogin() {
    emailLogin.reset();
    setCode('');
    setActiveMethod(null);
    setEmailValidationError(null);
    setCodeNotice(null);
    setResendCooldown(0);
  }

  function updateEmail(value: string) {
    setEmail(value);
    if (emailValidationError) setEmailValidationError(null);
  }

  function validateEmailOnBlur() {
    setEmailValidationError(email ? emailValidationMessage(email) : null);
  }

  return {
    activeMethod,
    auth,
    code,
    codeNotice,
    continueWithSignature,
    email,
    emailLogin,
    emailValidationError,
    loginWithOAuth,
    loginWithPasskey,
    loginWithWallet,
    methodPending,
    resendCooldown,
    resendEmailCode,
    resetEmailLogin,
    sendEmailCode,
    setCode,
    signatureWorking,
    updateEmail,
    validateEmailOnBlur,
    verifyEmailCode,
  };
}

export type LoginFlow = ReturnType<typeof useLoginFlow>;
