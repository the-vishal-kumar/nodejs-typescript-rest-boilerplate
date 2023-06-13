interface IAccessToken {
  id: string;
  userId: string;
  token: string;
  created: number;
  updated: number;
}

export { IAccessToken };
