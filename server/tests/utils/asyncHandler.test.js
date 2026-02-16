const asyncHandler = require('../../utils/asyncHandler');

describe('asyncHandler', () => {
  let req, res, next;

  beforeEach(() => {
    req = {};
    res = {};
    next = jest.fn();
  });

  it('should execute async function successfully', async () => {
    const mockFn = jest.fn().mockResolvedValue('success');
    const wrapped = asyncHandler(mockFn);

    await wrapped(req, res, next);

    expect(mockFn).toHaveBeenCalledWith(req, res, next);
    expect(next).not.toHaveBeenCalled();
  });

  it('should pass errors to next middleware', async () => {
    const error = new Error('Test error');
    const mockFn = jest.fn().mockRejectedValue(error);
    const wrapped = asyncHandler(mockFn);

    await wrapped(req, res, next);

    expect(next).toHaveBeenCalledWith(error);
  });

  it('should preserve function context', async () => {
    let capturedReq, capturedRes, capturedNext;
    const mockFn = jest.fn().mockImplementation((r1, r2, n) => {
      capturedReq = r1;
      capturedRes = r2;
      capturedNext = n;
      return Promise.resolve();
    });
    const wrapped = asyncHandler(mockFn);

    await wrapped(req, res, next);

    expect(capturedReq).toBe(req);
    expect(capturedRes).toBe(res);
    expect(capturedNext).toBe(next);
  });
});
