export class LoginCancelledError extends Error {
  constructor(message = "Đăng nhập đã bị hủy.") {
    super(message);
    this.name = "LoginCancelledError";
  }
}

let cancelRequested = false;

export function clearLoginCancel(): void {
  cancelRequested = false;
}

export function requestLoginCancel(): void {
  cancelRequested = true;
}

export function isLoginCancelRequested(): boolean {
  return cancelRequested;
}

export function assertLoginNotCancelled(): void {
  if (cancelRequested) {
    throw new LoginCancelledError();
  }
}
