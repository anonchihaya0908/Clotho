#import <Foundation/Foundation.h>

@interface ExampleClass : NSObject

@property(nonatomic, strong) NSString *name;
@property(nonatomic, assign) NSInteger value;

- (instancetype)initWithName:(NSString *)name value:(NSInteger)value;
- (void)performActionWithParam1:(NSString *)param1
                         param2:(NSInteger)param2
                         param3:(BOOL)param3
                         param4:(NSArray *)param4
                         param5:(NSDictionary *)param5;
- (NSArray *)processArray:(NSArray *)inputArray;

@end

@implementation ExampleClass

- (instancetype)initWithName:(NSString *)name value:(NSInteger)value {
  self = [super init];
  if (self) {
    _name = name;
    _value = value;
  }
  return self;
}

- (void)performActionWithParam1:(NSString *)param1
                         param2:(NSInteger)param2
                         param3:(BOOL)param3
                         param4:(NSArray *)param4
                         param5:(NSDictionary *)param5 {
  if (param3) {
    NSLog(@"Processing %@ with value %ld", param1, (long)param2);
    self.value = param2;
  } else {
    self.value = 0;
  }
}

- (NSArray *)processArray:(NSArray *)inputArray {
  NSMutableArray *result = [[NSMutableArray alloc] init];
  for (id item in inputArray) {
    [result addObject:item];
  }
  return [result copy];
}

@end

int main(int argc, const char *argv[]) {
  @autoreleasepool {
    ExampleClass *example = [[ExampleClass alloc] initWithName:@"Test"
                                                         value:42];

    NSArray *testArray = @[ @1, @2, @3, @4, @5 ];
    NSDictionary *testDict = @{@"key1" : @"value1", @"key2" : @"value2"};

    [example performActionWithParam1:@"TestParam"
                              param2:100
                              param3:YES
                              param4:testArray
                              param5:testDict];

    NSArray *result = [example processArray:testArray];
    NSLog(@"Result: %@", result);
  }
  return 0;
}
