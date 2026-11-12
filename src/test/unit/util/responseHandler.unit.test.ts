import { mongo, Types } from 'mongoose';
import { ResponseHandler } from '../../../util';

describe('ResponseHandler.removeSensitiveData', () => {
  it('should send UUIDs, ObjectIds and dates in their JSON form, not their internals', () => {
    const id = new mongo.UUID('2147895b-49d5-46d6-8c4d-d7631636371b');
    const userId = new Types.ObjectId('507f1f77bcf86cd799439011');
    const createdAt = new Date('2026-01-02T03:04:05.000Z');

    expect(ResponseHandler.removeSensitiveData({ id, userId, createdAt })).toEqual({
      id: '2147895b-49d5-46d6-8c4d-d7631636371b',
      userId: '507f1f77bcf86cd799439011',
      createdAt: '2026-01-02T03:04:05.000Z',
    });
  });

  it('should still drop _id, password and __v at any depth', () => {
    expect(
      ResponseHandler.removeSensitiveData({
        _id: 'x',
        __v: 0,
        email: 'a@example.com',
        password: 'hash',
        loans: [{ _id: 'y', amount: 10 }],
      }),
    ).toEqual({ email: 'a@example.com', loans: [{ amount: 10 }] });
  });
});
