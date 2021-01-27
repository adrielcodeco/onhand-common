import { container } from '@onhand/common-business/#/ioc/container'
import { model, Schema } from 'dynamoose'
import { Document } from 'dynamoose/dist/Document'
import { ModelType } from 'dynamoose/dist/General'
import { ModelOptions } from 'dynamoose/dist/Model'

const ohInternalVersionNotFoundMessage =
  'ohInternalVersion not found. Read the documentation TODO FIXME'

export type DyModelType<M> = ModelType<DyDocument<M>> & {
  findOne: <T>(result: T[]) => T | undefined
}

export type DyDocument<M> = Document & M

export function DyModel<M> (
  tableName: string,
  schema: any,
  options?: Partial<ModelOptions>,
): () => DyModelType<M> {
  return () => {
    Object.assign(schema, {
      ohInternalVersion: {
        type: String,
        default: async () => {
          if (!container.isBound('ohInternalVersion')) {
            throw new Error(ohInternalVersionNotFoundMessage)
          }
          const value = container.get<string>('ohInternalVersion')
          if (!value) {
            throw new Error(ohInternalVersionNotFoundMessage)
          }
          return value
        },
      },
    })
    const defaultOptions: Partial<ModelOptions> = {
      throughput: 'ON_DEMAND',
    }
    const Model = model<DyDocument<M>>(
      tableName,
      new Schema(schema, {
        saveUnknown: true,
        timestamps: true,
      }),
      Object.assign({}, defaultOptions, options),
    ) as DyModelType<M>
    Model.findOne = <T>(result: T[]) => (result.length ? result[0] : undefined)
    return Model
  }
}