
import {expect, sinon} from './test-setup';
import {LibraryContributor} from '../src/libcontribute';


describe('LibraryContributor', () => {
	const libraryDirectory = 'a/b/c';
	const libraryName = 'abcd';
	let repo, client, sut;

	beforeEach(() => {
		repo = {};
		client = {};
		sut = new LibraryContributor({repo, client});
	});

	it('saves the client and repo', () => {
		expect(sut.repo).to.be.deep.equal(repo);
		expect(sut.client).to.be.deep.equal(client);
	});

	describe('_contribute()', () => {
		it('uses the client.contribute() method to contribute a stream', () => {
			client.contributeLibrary = sinon.stub();
			const stream = 'stream';
			sut._contribute(libraryName, stream);
			expect(client.contributeLibrary).to.have.been.calledWith(stream);
			expect(client.contributeLibrary).to.have.been.calledOnce;
		});
	});

	describe('_buildContributePromise', () => {
		it('tars the directory but doesn\'t contribute for a dry run', () => {
			sut.targzdir = sinon.stub().resolves({});
			sut._contribute = sinon.stub();
			const dryRun = true;
			const exercise = sut._buildContributePromise(libraryDirectory, libraryName, dryRun);
			const validate = () => {
				expect(sut.targzdir).to.be.calledWith(libraryDirectory);
				expect(sut._contribute).to.not.have.been.called;
			};
			return exercise.then(validate);
		});

		it('tars the directory and contributees', () => {
			const pipe = 'pipe';
			sut.targzdir = sinon.stub().resolves(pipe);
			sut._contribute = sinon.stub();
			const dryRun = false;
			const exercise = sut._buildContributePromise(libraryDirectory, libraryName, dryRun);
			const validate = () => {
				expect(sut.targzdir).to.be.calledWith(libraryDirectory);
				expect(sut._contribute).to.have.been.calledWith(libraryName, pipe);
			};
			return exercise.then(validate);
		});
	});

	describe('_buildNotifyPromise', () => {
		function expectPromise(callbackPromise, callbackResult) {
			const notify = 'notifyMessage';
			const result = 'result';
			const promise = Promise.resolve(result);
			// duplicate the promise since sinon seems to detect that the original promise has
			// been resolved and uses the resolved value rather than the original promise for
			// call matching.
			const promise2 = Promise.resolve(result);
			const other1 = 'one';
			const other2 = 'two';
			const callback = sinon.stub().returns(callbackPromise);

			return sut._buildNotifyPromise(callback, notify, promise, other1, other2)
				.then((actualResult) => {
					expect(callback).to.have.been.calledWithMatch(notify, promise2, other1, other2);
					expect(actualResult).to.be.equal(callbackPromise ? callbackResult : result);
				});
		}

		it('returns the original promise when the callback returns a falsey value', () => {
			return expectPromise(false);
		});

		it('returns the overridden promise when the callback returns a truthy value', () => {
			return expectPromise(Promise.resolve(123), 123);
		});
	});

	describe('_buildValidatePromise', () => {
		describe('builds a promise that calls _validateLibrary', () => {
			afterEach(() => {
				expect(sut._validateLibrary).to.have.been.calledWith(repo, libraryName);
			});
		});

		function expectValidateResultSuccess(validateResult) {
			sut._validateLibrary = sinon.stub().resolves(validateResult);
			const exercise = () => sut._buildValidatePromise(libraryName);
			const validate = () => {};
			return exercise().then(validate);
		}

		it('validates with an empty result', () => {
			return expectValidateResultSuccess(undefined);
		});
		it('validates with a valid result', () => {
			return expectValidateResultSuccess({valid: true});
		});
		it('fails with a invalid result and no details', () => {
			const validationResult = {valid: false};
			const verifyError = () => {
				throw Error('expected exception');
			};
			const verify = (error) => {
				expect(error.validate).to.be.deep.equal(validationResult);
				expect(error.message).to.be.equal('Library is not valid. ');
			};
			return expectValidateResultSuccess(validationResult)
				.then(verifyError).catch(verify);
		});

		it('fails with a invalid result and validation details', () => {
			const validationResult = {valid: false, errors: { sympathy: 'is needed'}};
			const verifyError = () => {
				throw Error('expected exception');
			};
			const verify = (error) => {
				expect(error.validate).to.be.deep.equal(validationResult);
				expect(error.message).to.be.equal('Library is not valid. sympathy is needed');
			};
			return expectValidateResultSuccess(validationResult)
				.then(verifyError).catch(verify);
		});

	});

	describe('_doContributeLibrary', () => {
		it('calls _buildContributePromise', () => {
			const callback = sinon.stub();
			sut._buildContributePromise = sinon.stub().resolves();
			sut._buildNotifyPromise = sinon.stub().resolves();

			const library = { name: libraryName };
			const dryRun = 'dryRun';

			const exercise = sut._doContributeLibrary(callback, library, libraryDirectory, dryRun);
			const validate = () => {
				expect(sut._buildContributePromise).to.be.calledWith(libraryDirectory, libraryName, dryRun);
				expect(callback).to.be.calledWith('contributeComplete', library);
			};
			return exercise.then(validate);
		});
	});

	describe('contribute', () => {
		const contributeResult = 'contributeResult';
		beforeEach(() => {
			repo.libraryDirectory = sinon.stub().returns(libraryDirectory);
			sut._doContribute = sinon.stub().returns(contributeResult);
		});

		it('calls repo.libraryDirectory and passes that to _doContribute', () => {
			const callback = sinon.stub();
			const dryRun = 'dryRun';
			const result = sut.contribute(callback, libraryName, dryRun);
			expect(result).to.be.equal(contributeResult);
			expect(sut._doContribute).to.have.been.calledWith(callback, libraryName, libraryDirectory, dryRun);
		});

		afterEach(() => {
			expect(repo.libraryDirectory).to.have.been.calledWith(libraryName);
		});
	});

	describe('_doContribute', () => {
		const callback = sinon.stub();

		it('verify happy path', () => {
			const expectedResult = 123;
			const validatePromise = Promise.resolve({valid:true});
			const setup = () => {
				sut._buildValidatePromise = sinon.stub().returns(validatePromise);
				sut._buildNotifyPromise = sinon.stub().resolves(validatePromise);
				sut._doContributeDirect = sinon.stub().resolves(expectedResult);
			};
			const dryRun = false;
			const exercise = () => sut._doContribute(callback, libraryName, libraryDirectory, dryRun);
			const verify = (result) => {
				expect(sut._buildValidatePromise).to.have.been.calledWith(libraryName);
				expect(sut._buildNotifyPromise).to.have.been.calledWith(callback, 'validatingLibrary', validatePromise, libraryDirectory);
				expect(sut._doContributeDirect).to.have.been.calledWith(callback, libraryName, libraryDirectory, dryRun);
				expect(result).equals(expectedResult);
			};

			return Promise.resolve().then(setup).then(exercise).then(verify);
		});

		it('propagates validation failure', () => {
			const validationError = new Error('didn\'t validate');
			const validatePromise = Promise.reject(validationError);
			const setup = () => {
				sut._buildValidatePromise = sinon.stub().returns(validatePromise);
				sut._buildNotifyPromise = sinon.stub().resolves(validatePromise);
				sut._doContributeDirect = sinon.stub();
			};

			const dryRun = false;
			const exercise = () => sut._doContribute(callback, libraryName, libraryDirectory, dryRun);
			const verify = (result) => {
				expect(sut._doContributeDirect).to.not.have.been.called;
				expect(result).to.be.equal(validationError);
			};
			const verifyFail = () => {
				throw Error('expected exception');
			};

			return Promise.resolve().then(setup).then(exercise).then(verifyFail).catch(verify);
		});
	});
});