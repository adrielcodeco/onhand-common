/**
 * https://restfulapi.net/http-status-codes/
 * https://www.restapitutorial.com/httpstatuscodes.html
 */
'use strict'

// type Status = 'success' | 'fail' | 'error'

// type Response = {
//   status: Status
//   data?: any
//   message?: string
//   code?: string
// }

type SuccessResponse = {
  status: 'success'
  data: any
}

type FailResponse = {
  status: 'fail'
  data: any
}

type ErrorResponse = {
  status: 'error'
  message: string
  code?: string
  data?: any
}

/**
 * HTTP 200 - OK
 * The 200 status code is usually sent out in response to a GET request.
 */
export function http200 (data: any): SuccessResponse {
  return {
    status: 'success',
    data,
  }
}
export const OK = http200

/**
 * HTTP 201 - Created
 * The 201 status code is usually sent out in response to a POST request.
 */
export function http201 (data?: any): SuccessResponse {
  return {
    status: 'success',
    data,
  }
}
export const Created = http201

/**
 * HTTP 202 - Accepted
 * The 202 status code is usually sent out in response to a POST OR PUT request.
 */
export function http202 (): SuccessResponse {
  return {
    status: 'success',
    data: null,
  }
}
export const Accepted = http202

/**
 * HTTP 204 - No Content
 * The 204 status code is usually sent out in response to a GET, POST, PUT OR DELETE request.
 */
export function http204 (): SuccessResponse | null {
  return null
}
export const NoContent = http204

/**
 * HTTP 400 - Bad Request
 * The 400 status code is usually sent out in response to a GET, POST, PUT OR DELETE request.
 */
export function http400 (data?: any): FailResponse {
  return {
    status: 'fail',
    data,
  }
}
export const BadRequest = http400

/**
 * HTTP 401 - Unauthorized
 * The 401 status code is usually sent out in response to a GET, POST, PUT OR DELETE request.
 */
export function http401 (data?: any): FailResponse {
  return {
    status: 'fail',
    data,
  }
}
export const Unauthorized = http401

/**
 * HTTP 403 - Forbidden
 * The 403 status code is usually sent out in response to a GET, POST, PUT OR DELETE request.
 */
export function http403 (data?: any): FailResponse {
  return {
    status: 'fail',
    data,
  }
}
export const Forbidden = http403

/**
 * HTTP 404 - Not Found
 * The 404 error status code indicates that the REST API can’t map the
 * client’s URI to a resource but may be available in the future. Subsequent
 * requests by the client are permissible.
 * No indication is given of whether the condition is temporary or permanent.
 * The 410 (Gone) status code SHOULD be used if the server knows, through some
 * internally configurable mechanism, that an old resource is permanently
 * unavailable and has no forwarding address. This status code is commonly
 * used when the server does not wish to reveal exactly why the request has been
 * refused, or when no other response is applicable.
 */
export function http404 (data?: any): FailResponse {
  return {
    status: 'fail',
    data,
  }
}
export const NotFound = http404

/**
 * HTTP 412 - Precondition Failed
 * The 412 status code is usually sent out in response to a GET, POST, PUT OR DELETE request.
 */
export function http412 (data?: any): FailResponse {
  return {
    status: 'fail',
    data,
  }
}
export const PreconditionFailed = http412

/**
 * HTTP 500 - Internal Server Error
 * The 500 status code is usually sent out in response to a GET, POST, PUT OR DELETE request.
 */
export function http500 (
  data?: any,
  message = 'Something is broken',
  code?: string,
): ErrorResponse {
  return {
    status: 'error',
    message,
    data,
  }
}
export const InternalServerError = http500

/**
 * HTTP 501 - Not Implemented
 * The 501 status code is usually sent out in response to a GET, POST, PUT OR DELETE request.
 */
export function http501 (
  data?: any,
  message = 'Not Implemented',
): ErrorResponse {
  return {
    status: 'error',
    message,
    data,
  }
}
export const NotImplemented = http501

export const httpGuide = {
  get: {
    success: http200,
    fail: {
      itemNotFound: http404,
      forValidation: http412,
    },
    error: http500,
  },
  post: {
    success: {
      empty: http202,
      withData: http201,
    },
    fail: {
      itemNotFound: http404,
      forValidation: http412,
    },
    error: http500,
  },
  put: {
    success: {
      empty: http202,
      withData: http201,
    },
    fail: {
      itemNotFound: http404,
      forValidation: http412,
    },
    error: http500,
  },
  delete: {
    success: http204,
    fail: http404,
    error: http500,
  },
}
